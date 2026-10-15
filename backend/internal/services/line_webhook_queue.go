package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

const lineWebhookQueueKey = "queue:line_webhook:image_jobs"
const lineWebhookMessageDedupPrefix = "line:webhook:message:"

// LINEWebhookImageJob is a queued LINE image verification job.
type LINEWebhookImageJob struct {
	ID           string    `json:"id"`
	MerchantID   uuid.UUID `json:"merchant_id"`
	Event        LINEEvent `json:"event"`
	Acknowledged bool      `json:"acknowledged"`
	EnqueuedAt   time.Time `json:"enqueued_at"`
}

// LINEWebhookJobQueue queues LINE image work so webhook requests can return quickly.
type LINEWebhookJobQueue struct {
	client      *redis.Client
	lineService *LINEWebhookService
	fallback    chan LINEWebhookImageJob
	workers     int
}

// NewLINEWebhookJobQueue creates a Redis-backed LINE webhook job queue.
// If Redis is unavailable, it falls back to an in-process channel.
func NewLINEWebhookJobQueue(redisAddr string, lineService *LINEWebhookService) *LINEWebhookJobQueue {
	queue := &LINEWebhookJobQueue{
		lineService: lineService,
		fallback:    make(chan LINEWebhookImageJob, 256),
		workers:     3,
	}

	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "",
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: LINE webhook Redis queue unavailable, using in-process fallback: %v", err)
		_ = client.Close()
		return queue
	}

	queue.client = client
	log.Println("LINE webhook Redis queue initialized")
	return queue
}

// Start begins LINE webhook queue workers.
func (q *LINEWebhookJobQueue) Start(ctx context.Context) {
	if q == nil || q.lineService == nil {
		return
	}

	for i := 0; i < q.workers; i++ {
		workerID := i + 1
		if q.client != nil {
			go q.redisWorker(ctx, workerID)
		} else {
			go q.fallbackWorker(ctx, workerID)
		}
	}
}

// HasRedis reports whether this queue has a shared Redis backend.
func (q *LINEWebhookJobQueue) HasRedis() bool {
	return q != nil && q.client != nil
}

// ClaimMessage marks a LINE message as accepted for processing across all backend instances.
func (q *LINEWebhookJobQueue) ClaimMessage(ctx context.Context, merchantID uuid.UUID, messageID string) (bool, error) {
	if q == nil || q.client == nil {
		return true, nil
	}
	if messageID == "" {
		return false, fmt.Errorf("LINE message ID is empty")
	}

	key := fmt.Sprintf("%s%s:%s", lineWebhookMessageDedupPrefix, merchantID, messageID)
	return q.client.SetNX(ctx, key, "1", 24*time.Hour).Result()
}

// Enqueue adds a LINE image job to Redis, falling back to memory if Redis write fails.
func (q *LINEWebhookJobQueue) Enqueue(ctx context.Context, merchantID uuid.UUID, event LINEEvent, acknowledged bool) error {
	if q == nil {
		return fmt.Errorf("LINE webhook queue is nil")
	}

	job := LINEWebhookImageJob{
		ID:           uuid.NewString(),
		MerchantID:   merchantID,
		Event:        event,
		Acknowledged: acknowledged,
		EnqueuedAt:   time.Now(),
	}

	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal LINE webhook job: %w", err)
	}

	if q.client != nil {
		if err := q.client.RPush(ctx, lineWebhookQueueKey, payload).Err(); err == nil {
			log.Printf("Queued LINE image job %s for merchant %s message %s", job.ID, merchantID, eventMessageID(event))
			return nil
		} else {
			log.Printf("Failed to enqueue LINE image job in Redis, using fallback queue: %v", err)
		}
	}

	select {
	case q.fallback <- job:
		log.Printf("Queued LINE image job %s in fallback queue for merchant %s message %s", job.ID, merchantID, eventMessageID(event))
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		return fmt.Errorf("LINE webhook fallback queue is full")
	}
}

func (q *LINEWebhookJobQueue) redisWorker(ctx context.Context, workerID int) {
	log.Printf("LINE webhook Redis worker %d started", workerID)
	for {
		select {
		case <-ctx.Done():
			log.Printf("LINE webhook Redis worker %d stopped", workerID)
			return
		default:
		}

		result, err := q.client.BLPop(ctx, 5*time.Second, lineWebhookQueueKey).Result()
		if err != nil {
			if err == redis.Nil || ctx.Err() != nil {
				continue
			}
			log.Printf("LINE webhook Redis worker %d pop error: %v", workerID, err)
			time.Sleep(time.Second)
			continue
		}
		if len(result) < 2 {
			continue
		}

		q.handlePayload(workerID, []byte(result[1]))
	}
}

func (q *LINEWebhookJobQueue) fallbackWorker(ctx context.Context, workerID int) {
	log.Printf("LINE webhook fallback worker %d started", workerID)
	for {
		select {
		case <-ctx.Done():
			log.Printf("LINE webhook fallback worker %d stopped", workerID)
			return
		case job := <-q.fallback:
			payload, err := json.Marshal(job)
			if err != nil {
				log.Printf("LINE webhook fallback worker %d marshal error: %v", workerID, err)
				continue
			}
			q.handlePayload(workerID, payload)
		}
	}
}

func (q *LINEWebhookJobQueue) handlePayload(workerID int, payload []byte) {
	var job LINEWebhookImageJob
	if err := json.Unmarshal(payload, &job); err != nil {
		log.Printf("LINE webhook worker %d invalid job payload: %v", workerID, err)
		return
	}

	log.Printf("LINE webhook worker %d processing job %s merchant %s message %s", workerID, job.ID, job.MerchantID, eventMessageID(job.Event))
	if err := q.lineService.ProcessQueuedImageJob(job); err != nil {
		log.Printf("LINE webhook worker %d failed job %s: %v", workerID, job.ID, err)
	}
}

func eventMessageID(event LINEEvent) string {
	if event.Message == nil {
		return ""
	}
	return event.Message.ID
}

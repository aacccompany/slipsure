package repositories

import (
	"database/sql"
	"errors"

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(user *models.User) error
	FindByID(id uuid.UUID) (*models.User, error)
	FindByEmail(email string) (*models.User, error)
	FindByLineUserID(lineUserID string) (*models.User, error)
	Update(user *models.User) error
	UpdateEmailVerification(userID uuid.UUID, verified bool) error
	EmailExists(email string) (bool, error)
	LinkLineAccount(userID uuid.UUID, lineUserID string) error
	FindByMerchantID(merchantID uuid.UUID) ([]*models.User, error)
}

// userRepository implements UserRepository interface
type userRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new user repository instance
func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

// Create inserts a new user into the database
func (r *userRepository) Create(user *models.User) error {
	query := `
		INSERT INTO users (name, email, phone, password_hash, role, line_user_id, line_linked, email_verified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	var phone interface{} = nil
	if user.Phone != nil {
		phone = *user.Phone
	}

	var lineUserID interface{} = nil
	if user.LineUserID != nil {
		lineUserID = *user.LineUserID
	}

	err := r.db.QueryRow(query, user.Name, user.Email, phone, user.PasswordHash, user.Role, lineUserID, user.LineLinked, user.EmailVerified).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return err
	}

	return nil
}

// FindByID retrieves a user by ID
func (r *userRepository) FindByID(id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, name, email, phone, password_hash, role, merchant_id,
			   line_user_id, line_linked, email_verified, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	var phone *string
	var merchantID *uuid.UUID
	var lineUserID *string

	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Name, &user.Email, &phone, &user.PasswordHash, &user.Role, &merchantID,
		&lineUserID, &user.LineLinked, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.Phone = phone
	user.MerchantID = merchantID
	user.LineUserID = lineUserID

	return &user, nil
}

// FindByEmail retrieves a user by email
func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, name, email, phone, password_hash, role, merchant_id,
			   line_user_id, line_linked, email_verified, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	var phone *string
	var merchantID *uuid.UUID
	var lineUserID *string

	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Name, &user.Email, &phone, &user.PasswordHash, &user.Role, &merchantID,
		&lineUserID, &user.LineLinked, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.Phone = phone
	user.MerchantID = merchantID
	user.LineUserID = lineUserID

	return &user, nil
}

// FindByLineUserID retrieves a user by LINE user ID
func (r *userRepository) FindByLineUserID(lineUserID string) (*models.User, error) {
	query := `
		SELECT id, name, email, phone, password_hash, role, merchant_id,
			   line_user_id, line_linked, email_verified, created_at, updated_at
		FROM users
		WHERE line_user_id = $1
	`

	var user models.User
	var phone *string
	var merchantID *uuid.UUID
	var lineUserIDResult *string

	err := r.db.QueryRow(query, lineUserID).Scan(
		&user.ID, &user.Name, &user.Email, &phone, &user.PasswordHash, &user.Role, &merchantID,
		&lineUserIDResult, &user.LineLinked, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.Phone = phone
	user.MerchantID = merchantID
	user.LineUserID = lineUserIDResult

	return &user, nil
}

// Update updates a user's information
func (r *userRepository) Update(user *models.User) error {
	query := `
		UPDATE users
		SET name = $2, email = $3, phone = $4, line_user_id = $5, line_linked = $6, email_verified = $7, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	var phone interface{} = nil
	if user.Phone != nil {
		phone = *user.Phone
	}

	var lineUserID interface{} = nil
	if user.LineUserID != nil {
		lineUserID = *user.LineUserID
	}

	result, err := r.db.Exec(query, user.ID, user.Name, user.Email, phone, lineUserID, user.LineLinked, user.EmailVerified)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}

	return nil
}

// UpdateEmailVerification updates the email verification status
func (r *userRepository) UpdateEmailVerification(userID uuid.UUID, verified bool) error {
	query := `
		UPDATE users
		SET email_verified = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query, userID, verified)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}

	return nil
}

// EmailExists checks if an email is already registered
func (r *userRepository) EmailExists(email string) (bool, error) {
	query := `
		SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
	`

	var exists bool
	err := r.db.QueryRow(query, email).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// LinkLineAccount links a LINE account to a user
func (r *userRepository) LinkLineAccount(userID uuid.UUID, lineUserID string) error {
	query := `
		UPDATE users
		SET line_user_id = $2, line_linked = true, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query, userID, lineUserID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}

	return nil
}

// FindByMerchantID retrieves all users associated with a merchant
func (r *userRepository) FindByMerchantID(merchantID uuid.UUID) ([]*models.User, error) {
	query := `
		SELECT u.id, u.name, u.email, u.phone, u.password_hash, u.role, u.merchant_id,
			   u.line_user_id, u.line_linked, u.email_verified, u.created_at, u.updated_at
		FROM users u
		WHERE u.merchant_id = $1
		ORDER BY u.created_at DESC
	`

	rows, err := r.db.Query(query, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User

	for rows.Next() {
		var user models.User
		var phone *string
		var userMerchantID *uuid.UUID
		var lineUserID *string

		err := rows.Scan(
			&user.ID, &user.Name, &user.Email, &phone, &user.PasswordHash, &user.Role, &userMerchantID,
			&lineUserID, &user.LineLinked, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		user.Phone = phone
		user.MerchantID = userMerchantID
		user.LineUserID = lineUserID
		users = append(users, &user)
	}

	return users, nil
}

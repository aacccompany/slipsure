# LINE credit alerts

The backend sends 20%, 5%, and zero-credit alerts to the merchant owner's
linked LINE account from the SlipSure Official Account. Percentages use the
credits in unexpired packages that still have a balance. A newly purchased
package starts a new alert cycle. Alerts are queued after scan credits are
consumed, so a LINE API outage does not fail the scan.
Messages are in Thai and include the current balance. For balances above zero,
the warning shows the nearest expiry date among remaining credits.

Each credit package with a positive balance gets its own Thai expiry reminder
when it enters the 7-day, 3-day, and 1-day windows before expiry. The reminder
shows that package's remaining credits and its exact expiry time in Bangkok.
The worker checks the package again before sending, so exhausted or expired
packages do not generate stale reminders. These reminders run at startup and
every minute, and each window is sent at most once per package.

Set `LINE_MESSAGING_CHANNEL_ID`, `LINE_MESSAGING_CHANNEL_SECRET`, and
`LINE_MESSAGING_ACCESS_TOKEN` in the backend environment. The user's LINE Login
channel and this Messaging API channel must belong to the same LINE provider,
and the merchant owner must have added the Official Account as a friend.

The `quota_alerts` table stores pending and sent alerts. The backend applies
its migration automatically at startup. Failed pushes are retried with a
stable LINE retry key for up to 24 hours; stale warnings are skipped after a
new package is added. Already-low balances are checked on startup and every
minute, including balances that reached zero when credits expired.

At startup the backend logs the Official Account name and Basic ID resolved
from its channel access token. If LINE rejects a push with HTTP 400, the log
also records the recipient profile status and message validation result.
Profile 404 means the bot cannot access that user (for example, the account
was not added as a friend, was blocked, or the stored UID is stale). If the
profile and message both pass, inspect the LINE request ID with LINE support.

Admins can set a separate quota-alert LINE user ID on a merchant's detail page.
The backend checks that the platform Official Account can access the recipient
before saving it. This does not change the merchant owner's LINE login link.
Changing the destination requeues unsent alerts created in the last 24 hours;
future alerts use the same destination. "Use Owner" restores the owner's UID.

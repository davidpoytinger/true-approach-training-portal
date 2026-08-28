# True Approach Training Portal

Simple web portal for coaches to publish training-session videos and notes for players.

## MVP

Coach: select a player, create a session, upload multiple videos, add notes, publish.

Player: sign in, see newest session first, watch all session videos, read coach notes, and access previous sessions.

## Stack

- Next.js
- Vercel
- GitHub
- Caspio REST API v4
- Caspio file storage for MVP videos

## Caspio tables

### TA_Users
- UserID: AutoNumber / primary key
- Email: Text 255, unique
- DisplayName: Text 255
- Role: Text 20 (`Coach` or `Player`)
- PlayerID: Integer, nullable
- IsActive: Yes/No
- CreatedAt: Timestamp

### TA_Players
- PlayerID: AutoNumber / primary key
- FirstName: Text 100
- LastName: Text 100
- Email: Text 255, nullable
- IsActive: Yes/No
- CreatedAt: Timestamp

### TA_TrainingSessions
- SessionID: AutoNumber / primary key
- PlayerID: Integer
- SessionDate: Date/Time
- Title: Text 255
- CoachNotes: Text / large
- Status: Text 20 (`Draft` or `Published`)
- CreatedByUserID: Integer
- CreatedAt: Timestamp
- PublishedAt: Date/Time, nullable

### TA_SessionVideos
- VideoID: AutoNumber / primary key
- SessionID: Integer
- VideoFile: File / Attachment
- Title: Text 255
- CoachNote: Text / large
- DisplayOrder: Integer
- CreatedAt: Timestamp

One training session can have any number of session videos.

## Caspio API profile

Create a dedicated API profile for the portal and grant it access only to the four `TA_` tables. Keep all credentials server-side in Vercel environment variables.

## Suggested production URL

`training.trueapproachbaseball.com`

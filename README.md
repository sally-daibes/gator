# Gator

Gator is a command-line RSS feed aggregator built with TypeScript, PostgreSQL, and Drizzle ORM.

It allows users to create accounts, add RSS feeds, follow feeds created by other users, collect posts from RSS feeds, and browse the latest posts from feeds they follow.

## Requirements

Before running Gator, make sure you have:

* Node.js
* npm
* PostgreSQL
* Git

Gator uses PostgreSQL as its database and Drizzle ORM to interact with it.

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd gator
```

Install the project dependencies:

```bash
npm install
```

## PostgreSQL Setup

Make sure PostgreSQL is installed and running.

Create a database called `gator`:

```sql
CREATE DATABASE gator;
```

The application uses PostgreSQL on the default port `5432`.

## Configuration

Gator uses a configuration file located at:

```text
~/.gatorconfig.json
```

Create the file if it does not already exist:

```bash
nano ~/.gatorconfig.json
```

Add your PostgreSQL connection string:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable",
  "current_user_name": ""
}
```

Update the username and password if your PostgreSQL setup uses different credentials.

## Database Migrations

After configuring PostgreSQL, run the Drizzle migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Running Gator

Run Gator with:

```bash
npm run start <command>
```

## Commands

### Register

Create a new user:

```bash
npm run start register <username>
```

Example:

```bash
npm run start register alice
```

### Login

Log in as an existing user:

```bash
npm run start login <username>
```

Example:

```bash
npm run start login alice
```

### Users

List all users and show the current user:

```bash
npm run start users
```

### Add a Feed

Add a new RSS feed:

```bash
npm run start addfeed "<name>" "<url>"
```

Example:

```bash
npm run start addfeed "Hacker News RSS" "https://hnrss.org/newest"
```

Adding a feed also automatically follows it for the current user.

### Feeds

List all feeds stored in the database:

```bash
npm run start feeds
```

### Follow

Follow an existing feed by URL:

```bash
npm run start follow "<url>"
```

Example:

```bash
npm run start follow "https://hnrss.org/newest"
```

### Following

List the feeds followed by the current user:

```bash
npm run start following
```

### Unfollow

Unfollow a feed:

```bash
npm run start unfollow "<url>"
```

Example:

```bash
npm run start unfollow "https://hnrss.org/newest"
```

### Aggregate

Run the RSS aggregator continuously.

The argument is the time between requests:

```bash
npm run start agg 1m
```

Other examples:

```bash
npm run start agg 10s
npm run start agg 1h
```

The aggregator fetches RSS feeds, parses their posts, and stores the posts in PostgreSQL.

Press `Ctrl+C` to stop the aggregator.

### Browse

Browse the latest posts from the feeds followed by the current user:

```bash
npm run start browse
```

By default, it shows the latest 2 posts.

You can provide a custom limit:

```bash
npm run start browse 5
```

### Reset

Reset the database for local development and testing:

```bash
npm run start reset
```

This command removes the users and, because of the database relationships, their related feeds, follows, and posts are also removed.

## Project Structure

```text
src/
├── aggregator.ts
├── config.ts
├── index.ts
├── rss.ts
├── schema.ts
└── lib/
    └── db/
        ├── index.ts
        └── queries/
            ├── feeds.ts
            ├── feed_follows.ts
            ├── posts.ts
            └── users.ts
```

## Technologies

* TypeScript
* Node.js
* PostgreSQL
* Drizzle ORM
* Drizzle Kit
* fast-xml-parser
* Git
* GitHub



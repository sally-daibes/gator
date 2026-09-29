import { readConfig, setUser } from "./config.js";
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users.js";
import {
  createFeed,
  getFeedByUrl,
  getFeeds,
} from "./lib/db/queries/feeds.js";
import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feed_follows.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";
import { fetchFeed } from "./rss.js";
import { scrapeFeeds } from "./aggregator.js";
import type { Feed, User } from "./schema.js";

type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("a username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error("user does not exist");
  }

  setUser(username);

  console.log(`user has been set to ${username}`);
}

async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("a username is required");
  }

  const username = args[0];

  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error("user already exists");
  }

  const user = await createUser(username);

  setUser(username);

  console.log(`user has been created: ${username}`);
  console.log(user);
}

async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteAllUsers();

  console.log("Database reset successfully");
}

async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const users = await getUsers();
  const config = readConfig();

  for (const user of users) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("time_between_reqs is required");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(`Collecting feeds every ${args[0]}`);

  scrapeFeeds().catch((err) => {
    console.error(err);
  });

  const interval = setInterval(() => {
    scrapeFeeds().catch((err) => {
      console.error(err);
    });
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("invalid duration");
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("invalid duration");
  }
}

function printFeed(feed: Feed, user: User): void {
  console.log(`Feed: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User: ${user.name}`);
}

async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("name and url are required");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);

  printFeed(feed, user);

  const follow = await createFeedFollow(user.id, feed.id);

  console.log(`* ${follow.feedName} - ${follow.userName}`);
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("a feed URL is required");
  }

  const feed = await getFeedByUrl(args[0]);

  if (!feed) {
    throw new Error("feed does not exist");
  }

  const follow = await createFeedFollow(user.id, feed.id);

  console.log(`* ${follow.feedName} - ${follow.userName}`);
}

async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("a feed URL is required");
  }

  const feed = await getFeedByUrl(args[0]);

  if (!feed) {
    throw new Error("feed does not exist");
  }

  await deleteFeedFollow(user.id, feed.id);

  console.log(`unfollowed feed: ${feed.name}`);
}

async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 2;

  if (args.length > 0) {
    limit = Number(args[0]);

    if (isNaN(limit) || limit <= 0) {
      throw new Error("limit must be a positive number");
    }
  }

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  ${post.url}`);
    console.log(`  ${post.description ?? ""}`);
    console.log(`  ${post.publishedAt ?? ""}`);
  }
}

function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("no user is currently logged in");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
}

type CommandsRegistry = Record<string, CommandHandler>;

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

async function main(): Promise<void> {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);

  registerCommand(
    registry,
    "addfeed",
    middlewareLoggedIn(handlerAddFeed),
  );

  registerCommand(
    registry,
    "follow",
    middlewareLoggedIn(handlerFollow),
  );

  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(handlerFollowing),
  );

  registerCommand(
    registry,
    "unfollow",
    middlewareLoggedIn(handlerUnfollow),
  );

  registerCommand(
    registry,
    "browse",
    middlewareLoggedIn(handlerBrowse),
  );

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("not enough arguments");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
}

main();

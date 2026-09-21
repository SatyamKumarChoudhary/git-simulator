import type { TopicInsert } from "../registry";
import { branchesTopic } from "./branches";
import { everydayTopic } from "./everyday";
import { gettingStartedTopic } from "./getting-started";
import { mergingTopic } from "./merging";
import { remotesTopic } from "./remotes";
import { rewriteTopic } from "./rewrite";
import { tagsStashTopic } from "./tags-stash";
import { teamworkTopic } from "./teamwork";
import { undoTopic } from "./undo";

/**
 * Topics in play order, each with its own map. To add a topic, write a module next to these and drop its name
 * anywhere in this list — the position is the only thing that decides where it appears.
 */
export const topicsInOrder = [
  gettingStartedTopic,
  everydayTopic,
  remotesTopic,
  branchesTopic,
  mergingTopic,
  undoTopic,
  tagsStashTopic,
  rewriteTopic,
  teamworkTopic,
];

/**
 * Topics added without editing the list above — useful for extra packs or work in progress:
 *   { item: gitFlowTopic, place: { after: "teamwork" } }
 */
export const topicInserts: TopicInsert[] = [];

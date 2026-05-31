import { setTimeout as sleep } from "node:timers/promises";
import { libraryStore } from "@/lib/store/library";

const once = process.argv.includes("--once");
const intervalMs = Number(process.env.FOLIUM_WORKER_INTERVAL_MS ?? 2000);

async function main() {
  console.log(`Folium worker started${once ? " in --once mode" : ""}.`);

  do {
    const didWork = await libraryStore.runNextJob();
    if (didWork) {
      console.log("Processed one queued job.");
    } else if (once) {
      console.log("No queued jobs.");
    }

    if (once) break;
    if (!didWork) await sleep(intervalMs);
  } while (true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

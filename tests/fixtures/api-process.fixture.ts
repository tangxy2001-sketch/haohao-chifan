import { createApp } from "../../apps/api/src/app.ts";
import { runApiProcess } from "../../apps/api/src/main.ts";

await runApiProcess({
  createApplication: () => {
    const app = createApp();

    app.addHook("onClose", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (process.send === undefined) {
        throw new Error("Lifecycle fixture requires an IPC channel.");
      }

      await new Promise<void>((resolve, reject) => {
        process.send?.("close-hook-complete", (error) => {
          if (error === null) {
            resolve();
          } else {
            reject(error);
          }
        });
      });

      process.disconnect();
    });

    return app;
  },
});

import { container, instanceCachingFactory } from "tsyringe";
import BackBlazeB2 from "backblaze-b2";
import config from "config";
import { B2_APP_KEY, B2_KEY_ID } from "constants/config";
import Logger from "./helpers/Logger";
// Registering Backblaze B2 client
container.register<BackBlazeB2>(BackBlazeB2, {
  useValue: new BackBlazeB2({
    applicationKey: config.get(B2_KEY_ID),
    applicationKeyId: config.get(B2_APP_KEY),
  }),
});

// container.registerSingleton<Logger>()

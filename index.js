/**
 * @format
 */

import { AppRegistry } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";

import App from "./App";
import { name as appName } from "./app.json";

const firebaseApp = getApp();
const messaging = getMessaging(firebaseApp);

setBackgroundMessageHandler(
  messaging,
  async (remoteMessage) => {
    if (__DEV__) {
      console.log(
        "[Push] mensagem recebida em background:",
        remoteMessage,
      );
    }
  },
);

AppRegistry.registerComponent(appName, () => App);

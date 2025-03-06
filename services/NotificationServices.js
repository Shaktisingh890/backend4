import admin from "../config/firebase.js";

export const sendPushNotification = async (
  deviceTokens,
  title,
  body,
  dataPayload
) => {
  console.log("--- In sendPushNotification ---");
  console.log("deviceTokens (before filter):", deviceTokens);

  // Filter out invalid or empty tokens
  deviceTokens = Array.isArray(deviceTokens)
    ? deviceTokens.filter((token) => token)
    : deviceTokens;

  console.log("deviceTokens (after filter):", deviceTokens);
  console.log("title:", title);
  console.log("body:", body);
  console.log("dataPayload:", dataPayload);

  if (Array.isArray(deviceTokens) && deviceTokens.length > 0) {
    // Send notification to multiple devices
    const results = [];
    for (const token of deviceTokens) {
      const message = {
        token: token,
        notification: {
          title,
          body,
        },
        data: {
          ...dataPayload,
        },
        android: {
          priority: "high", // Ensures immediate delivery on Android
        }
      };

      try {
        const response = await admin.messaging().send(message); // Send each message individually
        console.log(`Successfully sent message to token ${token}:`, response);
        results.push({ token, response });
      } catch (error) {
        console.error(`Error sending message to token ${token}:`, error.message || error);
        results.push({ token, error });
      }
    }

    return results;
  } else if (deviceTokens) {
    // Send notification to a single device
    const message = {
      token: deviceTokens, // Single device token
      notification: {
        title,
        body,
      },
      data: {
        ...dataPayload,
      },
      android: {
        priority: "high", // Ensures immediate delivery on Android
      }
    };

    try {
      const response = await admin.messaging().send(message); // Send to a single token
      console.log("Successfully sent message to a single device:", response);
      return response;
    } catch (error) {
      console.error("Error sending to a single device:", error.message || error);
      throw error;
    }
  } else {
    console.error("No device tokens provided.");
    throw new Error("Device tokens are required");
  }
};

// Simple test of the Copilot SDK
import { CopilotClient } from "@github/copilot-sdk";

async function test() {
  console.log("[TEST] Creating client...");
  const client = new CopilotClient({
    logLevel: "debug",
  });

  console.log("[TEST] Starting client...");
  try {
    await client.start();
    console.log("[TEST] Client started!");
  } catch (error) {
    console.error("[TEST] Failed to start:", error);
    process.exit(1);
  }

  console.log("[TEST] Pinging...");
  try {
    const pong = await client.ping("hello");
    console.log("[TEST] Ping response:", pong);
  } catch (error) {
    console.error("[TEST] Ping failed:", error);
  }

  console.log("[TEST] Creating session...");
  try {
    const session = await client.createSession({
      model: "gpt-5",
    });
    console.log("[TEST] Session created:", session.sessionId);

    let gotResponse = false;
    session.on((event) => {
      console.log("[TEST] Event:", event.type);
      if (event.type === "assistant.message") {
        console.log("[TEST] Response:", event.data.content);
        gotResponse = true;
      }
      if (event.type === "session.idle") {
        console.log("[TEST] Session idle");
      }
    });

    console.log("[TEST] Sending prompt...");
    await session.send({ prompt: "Say 'hello world' and nothing else" });
    
    console.log("[TEST] Waiting 10 seconds for response...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (!gotResponse) {
      console.log("[TEST] No response received after 10 seconds");
    }

    await session.destroy();
  } catch (error) {
    console.error("[TEST] Session error:", error);
  }

  console.log("[TEST] Stopping client...");
  await client.stop();
  console.log("[TEST] Done!");
}

test().catch(console.error);

// Test the SDK with a larger prompt (like remote analyzer)
import { CopilotClient } from "@github/copilot-sdk";

async function test() {
  console.log("[TEST] Creating client...");
  const client = new CopilotClient({ logLevel: "debug" });

  console.log("[TEST] Starting client...");
  await client.start();
  console.log("[TEST] Client started!");

  console.log("[TEST] Creating session with system message...");
  const session = await client.createSession({
    model: "gpt-5",
    streaming: true,
    systemMessage: {
      content: "You are an AI that analyzes code. Respond in JSON only.",
    },
  });
  console.log("[TEST] Session created:", session.sessionId);

  let responseContent = "";
  let eventCount = 0;

  const done = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error(`[TEST] Timeout! Events received: ${eventCount}`);
      reject(new Error("timeout"));
    }, 60000);

    session.on((event) => {
      eventCount++;
      console.log(`[TEST] Event ${eventCount}: ${event.type}`);
      
      if (event.type === "assistant.message") {
        responseContent = (event.data as any).content || "";
        console.log(`[TEST] Response: ${responseContent}`);
      }
      if (event.type === "session.idle") {
        clearTimeout(timeout);
        console.log("[TEST] Session idle - resolving");
        resolve();
      }
      if (event.type === "error") {
        clearTimeout(timeout);
        console.error("[TEST] Error:", event.data);
        reject(new Error("error event"));
      }
    });
  });

  // Larger prompt like we'd send for analysis
  const prompt = `Analyze this code and return JSON:

\`\`\`go
package main

func main() {
    fmt.Println("hello")
}
\`\`\`

Return: {"skills": [], "agents": [], "summary": "test"}`;

  console.log("[TEST] Sending prompt...");
  await session.send({ prompt });
  console.log("[TEST] Prompt sent, waiting for response...");
  
  await done;
  
  console.log("[TEST] Done! Response:", responseContent);
  await session.destroy();
  await client.stop();
}

test().catch(e => {
  console.error("[TEST] Fatal error:", e);
  process.exit(1);
});

import readline from "node:readline";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "[ERROR] GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다.\n" +
      "PowerShell에서 다음과 같이 설정한 후 다시 실행하세요:\n\n" +
      '  $env:GEMINI_API_KEY = "YOUR_API_KEY_HERE"\n'
  );
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "you> ",
});

let chat;

async function ensureChat() {
  if (!chat) {
    chat = model.startChat({ history: [] });
  }
}

async function handleLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }

  if (["/exit", "/quit", "exit", "quit"].includes(trimmed.toLowerCase())) {
    rl.close();
    return;
  }

  try {
    await ensureChat();
    const result = await chat.sendMessage(trimmed);
    const text = result.response.text();
    console.log(`gemini> ${text}\n`);
  } catch (err) {
    console.error("[ERROR] Gemini API 호출 중 오류가 발생했습니다:");
    console.error(err?.message ?? err);
  } finally {
    rl.prompt();
  }
}

console.log(
  "Gemini chat 시작합니다. 종료하려면 'exit' 또는 '/exit' 를 입력하세요.\n"
);
rl.prompt();

rl.on("line", (line) => {
  void handleLine(line);
}).on("close", () => {
  console.log("채팅을 종료합니다.");
  process.exit(0);
});



import { sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function DevMailTest() {
  try {
    await sendMail({
      to: "test@example.com",
      subject: "Mailtrap test",
      html: "<b>Hello from Next.js</b>",
      text: "Hello from Next.js",
    });

    return <div className="p-8">OK: email sent (check Mailtrap inbox)</div>;
  } catch (e: any) {
    return <div className="p-8">ERROR: {e?.message || "unknown"}</div>;
  }
}

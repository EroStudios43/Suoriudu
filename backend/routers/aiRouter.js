import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/evaluate", async (req, res) => {
  const { type, question, studentAnswer, exampleAnswer, maxPoints } = req.body;
  const pointsLimit = Number(maxPoints);

  if (type !== "essay") {
    return res.status(400).json({ error: "AI-arviointi on tällä hetkellä käytössä vain esseetehtäville" });
  }

  if (!question || !studentAnswer || !Number.isFinite(pointsLimit) || pointsLimit < 0) {
    return res.status(400).json({ error: "Tehtävänanto, oppilaan vastaus ja maksimipisteet vaaditaan" });
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "Arvioi vain opettajan antama esseetehtävä. Palauta vain JSON muodossa {\"points\": number, \"comment\": string}. Pisteiden pitää olla välillä 0 ja maxPoints. Älä tallenna tietoja."
          },
          {
            role: "user",
            content: `Tehtävänanto:\n<question>${question}</question>\n\nMallivastaus tai arviointiohje:\n<example>${exampleAnswer || "Ei annettu"}</example>\n\nOppilaan vastaus:\n<student>${studentAnswer}</student>\n\nMaksimipisteet: ${pointsLimit}\nArvioi vastauksen oikeellisuus, perustelut ja tehtävänannon noudattaminen. Anna lyhyt, oppilaalle sopiva palaute.`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.Ai_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    const points = Math.min(pointsLimit, Math.max(0, Number(result.points)));

    if (!Number.isFinite(points) || typeof result.comment !== "string") {
      return res.status(502).json({ error: "AI palautti virheellisen arvioinnin" });
    }

    return res.json({ points, comment: result.comment.trim() });
  } catch (err) {
    console.error("Groq evaluation error:", err.response?.data || err.message);
    return res.status(500).json({ error: "AI-arviointi epäonnistui" });
  }
});

router.post("/", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "You generate teacher-ready exercise drafts. Return only valid JSON. Never save data or call tools."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.Ai_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Groq error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;

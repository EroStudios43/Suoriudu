import express from "express";
import axios from "axios";

const router = express.Router();

const parseJsonLike = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

router.post("/evaluate", async (req, res) => {
  const { type, question, studentAnswer, exampleAnswer, starterCode, testCases, maxPoints } = req.body;
  const normalizedType = typeof type === "string" ? type.toLowerCase() : "essay";
  const pointsLimit = Number(maxPoints);

  if (!['essay', 'coding'].includes(normalizedType)) {
    return res.status(400).json({ error: "AI-arviointi tukee vain esseitä ja ohjelmointitehtäviä" });
  }

  if (!question || !studentAnswer || !Number.isFinite(pointsLimit) || pointsLimit < 0) {
    return res.status(400).json({ error: "Tehtävänanto, oppilaan vastaus ja maksimipisteet vaaditaan" });
  }

  const parsedExample = parseJsonLike(exampleAnswer);
  const parsedStarterCode = typeof starterCode === "string"
    ? starterCode
    : typeof parsedExample?.starterCode === "string"
      ? parsedExample.starterCode
      : "";
  const parsedTestCases = Array.isArray(testCases)
    ? testCases
    : Array.isArray(parsedExample?.testCases)
      ? parsedExample.testCases
      : [];

  const systemContent = normalizedType === "coding"
    ? "Arvioi ohjelmointitehtävän ratkaisua. Tarkista tehtävänanto, toteutus ja mahdolliset testCases. Jos testCases puuttuvat, arvioi perustuen tehtävänannon ja toteutuksen järkevyteen. Palauta vain JSON muodossa {\"points\": number, \"comment\": string}. Pisteiden pitää olla välillä 0 ja maxPoints, ja puolikkaita pisteitä (esim. 1.5) on sallittu. Älä tallenna tietoja."
    : "Arvioi vain opettajan antama esseetehtävä. Palauta vain JSON muodossa {\"points\": number, \"comment\": string}. Pisteiden pitää olla välillä 0 ja maxPoints, ja puolikkaita pisteitä (esim. 1.5) on sallittu. Älä tallenna tietoja.";

  const userContent = normalizedType === "coding"
    ? `Tehtävänanto:\n<question>${question}</question>\n\nStarter code:\n<starterCode>${parsedStarterCode || "Ei annettu"}</starterCode>\n\nTest cases:\n<testCases>${JSON.stringify(parsedTestCases || [])}</testCases>\n\nJos testCases on tyhjä lista, tämä tarkoittaa, että testejä ei ole saatavilla. Arvioi tehtävänannon ja toteutuksen perusteella.\n\nOppilaan vastaus:\n<student>${studentAnswer}</student>\n\nMaksimipisteet: ${pointsLimit}\nArvioi, onko toteutus tehtävänannon mukainen, toimiva ja järkevä. Jos testit ovat mukana, käytä niitä osana arviointia. Anna lyhyt, oppilaalle sopiva palaute. Pisteet voivat olla myös puolikkaita, esim. 1.5.`
    : `Tehtävänanto:\n<question>${question}</question>\n\nMallivastaus tai arviointiohje:\n<example>${exampleAnswer || "Ei annettu"}</example>\n\nOppilaan vastaus:\n<student>${studentAnswer}</student>\n\nMaksimipisteet: ${pointsLimit}\nArvioi vastauksen oikeellisuus, perustelut ja tehtävänannon noudattaminen. Anna lyhyt, oppilaalle sopiva palaute. Pisteet voivat olla myös puolikkaita, esim. 1.5.`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: systemContent
          },
          {
            role: "user",
            content: userContent
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

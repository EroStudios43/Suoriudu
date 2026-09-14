export const normalizeEvaluationRequest = (payload = {}) => {
  const normalized = { ...payload };

  const rawTestCases = Array.isArray(normalized.testCases) ? normalized.testCases : [];
  normalized.testCases = rawTestCases.map((testCase) => ({
    ...testCase,
    input: Array.isArray(testCase?.input) ? testCase.input : [],
    expectedOutput: testCase?.expectedOutput ?? testCase?.expected ?? null,
    functionName: testCase?.functionName || testCase?.name || ''
  }));

  if (!normalized.type) {
    normalized.type = 'essay';
  }

  return normalized;
};

export const buildEvaluationPrompt = (payload = {}) => {
  const normalized = normalizeEvaluationRequest(payload);
  const type = normalized.type || 'essay';
  const testCasesText = normalized.testCases.length
    ? JSON.stringify(normalized.testCases, null, 2)
    : 'ei testCases-tietoa; arvioi tehtävänannon ja toteutuksen perusteella';

  const basePrompt = `Arvioi tämän ${type}-tehtävän ratkaisun.
Tehtävänanto:
<question>${normalized.question || ''}</question>

Mallivastaus / arviointiohje:
<example>${normalized.exampleAnswer || 'Ei annettu'}</example>

Oppilaan vastaus:
<student>${normalized.studentAnswer || ''}</student>

Maksimipisteet: ${Number(normalized.maxPoints ?? 0) || 0}

Arviointiperusteet:
- Tarkista, että vastaus täyttää tehtävänannon.
- Tarkista, että toteutus on looginen ja toimiva.
- Jos tehtävä on ohjelmointitehtävä, ota huomioon myös testit ja funktion nimi sekä syötteet/vastaustyypit.
- Jos testCases ei ole saatavilla, arvioi tehtävänannon ja toteutuksen perusteella ja kerro, että arvio perustuu tehtävänantoon ilman test case -dataa.
- Jos testCases on saatavilla, käytä niitä osana arviointia.
- Anna lyhyt, oppilaalle sopiva palaute.

${type === 'coding' ? `Ohjelmointitehtävän testit:
<testCases>${testCasesText}</testCases>

Jos testCases ei ole käytettävissä, arvioi tehtävänanto ja toteutus ilman testaustietoa.` : ''}

Palauta vain JSON muodossa {"points": number, "comment": string}.`;

  if (type === 'coding') {
    return `${basePrompt}

Tärkeä: arvioi myös tehtävänantoa, toteutusta ja mahdollisia testejä. Jos ohjelma näyttää toimivalta tehtävänannon mukaan vaikka testCases puuttuu, anna kohtuullinen pistemäärä, mutta älä anna täysiä pisteitä ilman perustelua.`;
  }

  return basePrompt;
};

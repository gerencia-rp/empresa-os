import assert from 'node:assert/strict';
import { collectGrowthPublicResearch } from '../api/brain-chat.mjs';

const research = await collectGrowthPublicResearch();

assert.equal(research.status, 'verified_public');
assert.ok(Date.parse(research.collectedAt), 'La lectura debe quedar fechada');
assert.equal(research.profiles.length, 3, 'Deben existir las tres cuentas públicas documentadas');
assert.ok(research.profiles.every(profile => profile.followers > 0 && profile.posts > 0), 'Los perfiles deben traer conteos públicos');
assert.ok(research.youtube.topShorts.length >= 5, 'La muestra debe incluir Shorts suficientes para comparar');
assert.ok(research.youtube.topVideos.length >= 5, 'La muestra debe incluir videos largos suficientes para comparar');
assert.ok(research.youtube.transcripts.filter(item => item.transcriptStatus === 'available' && item.transcript.length > 100).length >= 2, 'Deben recuperarse transcripciones útiles');
assert.ok(research.limitations.length >= 3, 'La respuesta debe declarar límites de atribución y calidad');

console.log(`Growth public research: ${research.youtube.sample.shorts} Shorts, ${research.youtube.sample.videos} largos y ${research.youtube.transcripts.filter(item => item.transcriptStatus === 'available').length} transcripciones verificadas.`);

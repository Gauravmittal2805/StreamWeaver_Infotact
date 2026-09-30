import assert from 'node:assert';
import { validateMapping, saveMapping, getMapping, previewMappingTransformation, previewCustomRule } from '../src/services/mapping.service.js';
import { executeCustomJavaScript, applyTransformation, transformRecord } from '../src/utils/transformation.utils.js';
import { createMappingTransform } from '../src/streams/mapping.transform.js';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

async function runAudit() {
  console.log('=====================================================');
  console.log('       STREAMWEAVER WEEK 2 BACKEND AUDIT CHECKLIST    ');
  console.log('=====================================================\n');

  const results = {};

  // Test 1: Mapping Validation
  try {
    const validRes = validateMapping({
      datasetId: 'test_ds_1',
      mappings: [
        { sourceField: 'first_name', destinationField: 'firstName', transformation: 'uppercase' }
      ]
    });
    // Mock dataset existence check
    const invalidRes = validateMapping({});
    assert.strictEqual(invalidRes.valid, false, 'Invalid mapping should return valid: false');
    results['Mapping Validation'] = 'PASS';
  } catch (err) {
    results['Mapping Validation'] = `FAIL: ${err.message}`;
  }

  // Test 2: Predefined Transformations
  try {
    assert.strictEqual(applyTransformation('gaurav', 'uppercase'), 'GAURAV');
    assert.strictEqual(applyTransformation('GAURAV', 'lowercase'), 'gaurav');
    assert.strictEqual(applyTransformation('  hello  ', 'trim'), 'hello');
    assert.strictEqual(applyTransformation('123.45', 'number'), 123.45);
    assert.strictEqual(applyTransformation('hello world', 'replace', { find: 'world', replaceWith: 'stream' }), 'hello stream');
    assert.strictEqual(applyTransformation('123', 'prefix', { prefix: 'ID_' }), 'ID_123');
    assert.strictEqual(applyTransformation('file', 'suffix', { suffix: '.csv' }), 'file.csv');
    assert.strictEqual(applyTransformation('', 'default_value', { defaultValue: 'N/A' }), 'N/A');
    results['Predefined Transformations'] = 'PASS';
  } catch (err) {
    results['Predefined Transformations'] = `FAIL: ${err.message}`;
  }

  // Test 3: Custom JS Sandbox & Timeout Handling
  try {
    const validExec = executeCustomJavaScript('return value.toUpperCase() + "_TEST";', 'item', {});
    assert.strictEqual(validExec.success, true);
    assert.strictEqual(validExec.result, 'ITEM_TEST');

    // Syntax error
    const syntaxExec = executeCustomJavaScript('return value..toUpperCase();', 'item', {});
    assert.strictEqual(syntaxExec.success, false);
    assert.strictEqual(syntaxExec.errorType, 'INVALID_TRANSFORMATION');

    // Timeout error (infinite loop)
    const timeoutExec = executeCustomJavaScript('while(true){}', 'item', {}, 100);
    assert.strictEqual(timeoutExec.success, false);
    assert.strictEqual(timeoutExec.errorType, 'SANDBOX_TIMEOUT');

    results['Custom JS Isolated VM & Sandbox Timeout'] = 'PASS';
  } catch (err) {
    results['Custom JS Isolated VM & Sandbox Timeout'] = `FAIL: ${err.message}`;
  }

  // Test 4: Custom JS Preview
  try {
    const previewRes = await previewCustomRule({
      code: 'return value.trim().toLowerCase();',
      sampleValues: ['  ADMIN  ', ' USER ']
    });
    assert.strictEqual(previewRes.valid, true);
    assert.strictEqual(previewRes.comparisons[0].after, 'admin');
    results['Custom JS Rule Preview'] = 'PASS';
  } catch (err) {
    results['Custom JS Rule Preview'] = `FAIL: ${err.message}`;
  }

  // Test 5: Unified Mapping + Transformation Pipeline
  try {
    const record = { first_name: ' gaurav ', age_str: '25', role: 'admin' };
    const mappings = [
      { sourceField: 'first_name', destinationField: 'name', transformation: 'uppercase' },
      { sourceField: 'age_str', destinationField: 'age', transformation: 'number' },
      { sourceField: 'role', destinationField: 'roleCode', transformation: 'custom_js', transformConfig: { code: 'return "ROLE_" + value.toUpperCase();' } }
    ];

    const transformed = transformRecord(record, mappings, 'ignore');
    assert.strictEqual(transformed.name, ' GAURAV '); // string UPPERCASE
    assert.strictEqual(transformed.age, 25);
    assert.strictEqual(transformed.roleCode, 'ROLE_ADMIN');
    assert.strictEqual(transformed._isMapped, true);
    results['Unified Mapping + Transformation Engine'] = 'PASS';
  } catch (err) {
    results['Unified Mapping + Transformation Engine'] = `FAIL: ${err.message}`;
  }

  // Test 6: Stream Processor Integration
  try {
    const sampleRecords = [
      { raw_name: 'alice', score: '100' },
      { raw_name: 'bob', score: '200' }
    ];

    const mappings = [
      { sourceField: 'raw_name', destinationField: 'name', transformation: 'uppercase' },
      { sourceField: 'score', destinationField: 'scoreVal', transformation: 'number' }
    ];

    const sourceStream = Readable.from(sampleRecords);
    const mappingStream = createMappingTransform({ mappings });

    const processed = [];
    mappingStream.on('data', (data) => processed.push(data));

    await pipeline(sourceStream, mappingStream);

    assert.strictEqual(processed.length, 2);
    assert.strictEqual(processed[0].name, 'ALICE');
    assert.strictEqual(processed[0].scoreVal, 100);
    assert.strictEqual(processed[1].name, 'BOB');
    assert.strictEqual(processed[1].scoreVal, 200);

    results['Mapping Stream Processor'] = 'PASS';
  } catch (err) {
    results['Mapping Stream Processor'] = `FAIL: ${err.message}`;
  }

  // Print Summary Checklist
  console.log('--- AUDIT CHECKLIST RESULTS ---');
  for (const [key, val] of Object.entries(results)) {
    const statusSymbol = val === 'PASS' ? '✅' : '❌';
    console.log(`${statusSymbol} ${key.padEnd(45)}: ${val}`);
  }

  const allPassed = Object.values(results).every(v => v === 'PASS');
  console.log('\nFinal Status:', allPassed ? 'ALL WEEK 2 COMPONENTS PASSED AUDIT! 🎉' : 'SOME COMPONENTS FAILED');
  if (!allPassed) process.exit(1);
}

runAudit().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});

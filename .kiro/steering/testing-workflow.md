# Testing Workflow

## Node.js Test Execution

When you need to run Node.js code for testing or validation purposes:

1. **Write test code to a temporary file** named `temporary-test.js` in the project root
2. **Execute the file** using `node temporary-test.js`
3. This avoids requiring user approval for each execution

### Example

Instead of running inline code with `node -e "..."`, write to the temporary file:

```javascript
// temporary-test.js
const Ajv = require('ajv');
const schema = require('./src/schemas/circuit.schema.json');

const ajv = new Ajv();
const validate = ajv.compile(schema);

console.log('Schema is valid!');
```

Then execute:
```bash
node temporary-test.js
```

### Benefits

- No user approval needed for each test run
- Code is visible and can be inspected
- Easier to debug and modify
- Can be rerun without rewriting

### Cleanup

The `temporary-test.js` file can be deleted after testing is complete, or left for future reference.

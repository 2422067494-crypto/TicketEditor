// 用 Babel 解析后重新生成，去掉 JS 注释。解析失败的文件原样保留并报告。
// 用法：node scripts/strip-js.js <file> [file...]
const fs = require('fs');
const path = require('path');

let parser, generate;
try {
    parser = require('@babel/parser');
    generate = require('@babel/generator').default;
} catch (e) {
    console.error('MISSING_DEP 需要先运行 npm install（依赖 @babel/parser、@babel/generator）');
    process.exit(3);
}

const PLUGINS = [
    'jsx', 'classProperties', 'classPrivateProperties', 'classPrivateMethods',
    'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator',
    'logicalAssignment', 'numericSeparator', 'topLevelAwait',
];

const PARSE_OPTS = {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    allowImportExportEverywhere: true,
    allowNewTargetOutsideFunction: true,
    errorRecovery: true,
    plugins: PLUGINS,
};

function strip(code) {
    const ast = parser.parse(code, PARSE_OPTS);
    return {
        out: generate(ast, {
            comments: false,
            compact: false,
            concise: false,
            retainLines: true,
            jsescOption: { minimal: true },
        }, code).code,
        warnings: (ast.errors || []).map(e => e.message),
    };
}

let ok = 0, fail = 0;
for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.trim()) { console.log('SKIP empty ' + file); continue; }
    try {
        const { out, warnings } = strip(src);
        if (out === src) { console.log('SAME ' + file); ok++; continue; }
        fs.writeFileSync(file, out, 'utf8');
        console.log('OK ' + file + (warnings.length ? '  [warn: ' + warnings[0] + ']' : ''));
        ok++;
    } catch (e) {
        console.error('FAIL ' + file + '  ' + e.message.split('\n')[0]);
        fail++;
    }
}
console.log('js: ' + ok + ' ok, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

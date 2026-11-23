/**
 * codeDriver.service.js
 * Universal LeetCode Backend Driver & Harness Service for CoderHaveli
 * 
 * Features:
 * 1. Automatically wraps function-only / class-only code (LeetCode style) into runnable programs.
 * 2. Parses LeetCode string inputs (e.g. `nums = [2,7,11,15], target = 9`) into native types.
 * 3. Serializes outputs to match exact LeetCode / platform testcase formats.
 * 4. Zero interference: If user code already contains an entry point (`main`), it passes through untouched.
 * 5. Generates on-the-fly starter code templates without requiring external collections.
 */

const codeDriver = {};

/**
 * Checks if user code requires a driver harness.
 * If user already provided `main()` or input reading, returns false.
 */
codeDriver.needsDriver = function (code, language) {
    if (!code || typeof code !== 'string') return false;
    const lang = (language || '').toLowerCase().trim();

    if (lang === 'python' || lang === 'py') {
        return !(/if\s+__name__\s*==\s*['"]__main__['"]/i.test(code) ||
            /\bdef\s+main\s*\(/i.test(code) ||
            /\bsys\.stdin\b/i.test(code) ||
            /\binput\s*\(/i.test(code));
    }

    if (lang === 'javascript' || lang === 'js') {
        return !(/\bfunction\s+main\s*\(/i.test(code) ||
            /\bconst\s+main\s*=/i.test(code) ||
            /\blet\s+main\s*=/i.test(code) ||
            /\bvar\s+main\s*=/i.test(code) ||
            /\bprocess\.stdin\b/i.test(code) ||
            /\breadline\b/i.test(code) ||
            /\bfs\.readFileSync\s*\(\s*0\b/i.test(code));
    }

    if (lang === 'java') {
        return !(/\bpublic\s+static\s+void\s+main\s*\(/i.test(code));
    }

    if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
        return !(/\b(?:int|void)\s+main\s*\(/i.test(code));
    }

    return false;
};

/**
 * Extracts target function/method name from user code.
 */
codeDriver.extractFunctionName = function (code, language) {
    if (!code) return 'solution';
    const lang = (language || '').toLowerCase().trim();

    if (lang === 'python' || lang === 'py') {
        const m = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
        if (m) {
            for (const item of m) {
                const name = item.replace(/def\s+/, '').replace(/\s*\(/, '').trim();
                if (name !== 'main' && !name.startsWith('__')) return name;
            }
        }
    } else if (lang === 'javascript' || lang === 'js') {
        const fnMatch = code.match(/(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
        if (fnMatch && fnMatch[1] !== 'main') return fnMatch[1];

        const varMatch = code.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)/);
        if (varMatch && varMatch[1] !== 'main') return varMatch[1];

        const methodMatch = code.match(/class\s+Solution[\s\S]*?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/);
        if (methodMatch && methodMatch[1] !== 'constructor') return methodMatch[1];
    } else if (lang === 'java') {
        const m = code.match(/(?:public|protected|private)?\s*(?:static\s+)?[\w<>[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g);
        if (m) {
            for (const item of m) {
                const nameMatch = item.match(/\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
                if (nameMatch && nameMatch[1] !== 'main') return nameMatch[1];
            }
        }
    } else if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
        const m = code.match(/(?:auto|void|int|bool|string|vector<[\w\s,<>]+>)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/);
        if (m && m[1] !== 'main') return m[1];
    }

    return 'solution';
};

/**
 * Universal JavaScript Harness
 */
function buildJsHarness(userCode, fnName) {
    return `${userCode}

// --- CODERHAVELI AUTOMATIC EXECUTION HARNESS ---
(function() {
    const fs = require('fs');

    function parseInput(input) {
        if (!input || !input.trim()) return [];
        const str = input.trim();
        const regex = /(?:^|[\\r\\n]+|,\\s*)([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*/g;
        const matches = [];
        let m;
        while ((m = regex.exec(str)) !== null) {
            matches.push({ name: m[1], start: m.index, valStart: m.index + m[0].length });
        }
        if (matches.length === 0) {
            const lines = str.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length > 1) {
                return lines.map(l => {
                    try { return JSON.parse(l); } catch { return l; }
                });
            }
            try { return [JSON.parse(str)]; } catch { return [str]; }
        }
        const result = [];
        for (let i = 0; i < matches.length; i++) {
            const end = i + 1 < matches.length ? matches[i + 1].start : str.length;
            let valStr = str.slice(matches[i].valStart, end).trim();
            if (valStr.endsWith(',')) valStr = valStr.slice(0, -1).trim();
            try {
                result.push(JSON.parse(valStr));
            } catch (e) {
                result.push(valStr);
            }
        }
        return result;
    }

    try {
        const rawInput = fs.readFileSync(0, 'utf-8');
        const args = parseInput(rawInput);

        let targetFn = null;
        if (typeof Solution !== 'undefined') {
            try {
                const sol = new Solution();
                const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(sol));
                const method = proto.find(m => m !== 'constructor' && typeof sol[m] === 'function');
                if (method) targetFn = sol[method].bind(sol);
            } catch (e) {
                if (typeof Solution === 'function') targetFn = Solution;
            }
        }

        if (!targetFn && typeof ${fnName} === 'function') {
            targetFn = ${fnName};
        }

        if (!targetFn) {
            // Find first available function in scope
            const fns = Object.keys(global).filter(k => typeof global[k] === 'function' && !['setTimeout', 'setInterval', 'setImmediate'].includes(k));
            if (fns.length > 0) targetFn = global[fns[0]];
        }

        if (!targetFn) {
            console.error("Executable function not found.");
            process.exit(1);
        }

        const result = targetFn(...args);

        if (result !== undefined) {
            if (typeof result === 'boolean') {
                console.log(result ? 'true' : 'false');
            } else {
                console.log(JSON.stringify(result));
            }
        } else if (args.length > 0) {
            // In-place array or object modification (e.g. reverseString, sortColors)
            console.log(JSON.stringify(args[0]));
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
`;
}

/**
 * Universal Python Harness
 */
function buildPythonHarness(userCode, fnName) {
    return `${userCode}

# --- CODERHAVELI AUTOMATIC EXECUTION HARNESS ---
if __name__ == '__main__':
    import sys, json, re, ast

    def parse_input(raw_input):
        if not raw_input or not raw_input.strip():
            return []
        s = raw_input.strip()
        matches = list(re.finditer(r'(?:^|[\\r\\n]+|,\\s*)([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*', s))
        if not matches:
            lines = [l.strip() for l in s.splitlines() if l.strip()]
            if len(lines) > 1:
                res = []
                for line in lines:
                    try:
                        res.append(json.loads(line))
                    except Exception:
                        try:
                            res.append(ast.literal_eval(line))
                        except Exception:
                            res.append(line)
                return res
            try:
                return [json.loads(s)]
            except Exception:
                try:
                    return [ast.literal_eval(s)]
                except Exception:
                    return [s]
        result = []
        for i in range(len(matches)):
            start = matches[i].end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(s)
            val_str = s[start:end].strip()
            if val_str.endswith(','):
                val_str = val_str[:-1].strip()
            try:
                result.append(json.loads(val_str))
            except Exception:
                try:
                    result.append(ast.literal_eval(val_str))
                except Exception:
                    result.append(val_str)
        return result

    def serialize_output(val):
        if val is None:
            return "null"
        if isinstance(val, bool):
            return "true" if val else "false"
        return json.dumps(val, separators=(',', ':'))

    try:
        raw_in = sys.stdin.read()
        args = parse_input(raw_in)

        target_fn = None
        if 'Solution' in globals() and isinstance(Solution, type):
            sol = Solution()
            methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
            if '${fnName}' in methods:
                target_fn = getattr(sol, '${fnName}')
            elif methods:
                target_fn = getattr(sol, methods[0])

        if not target_fn and '${fnName}' in globals() and callable(globals()['${fnName}']):
            target_fn = globals()['${fnName}']

        if not target_fn:
            user_funcs = [v for k, v in globals().items() if not k.startswith('_') and callable(v) and k not in ('parse_input', 'serialize_output')]
            if user_funcs:
                target_fn = user_funcs[0]

        if not target_fn:
            sys.stderr.write("No executable function found\\n")
            sys.exit(1)

        res = target_fn(*args)
        if res is not None:
            print(serialize_output(res))
        elif len(args) > 0:
            print(serialize_output(args[0]))
    except Exception as e:
        sys.stderr.write(str(e) + "\\n")
        sys.exit(1)
`;
}

/**
 * Universal Java Harness (Reflection-based)
 */
function buildJavaHarness(userCode) {
    // Ensure user code class Solution is package-private or accessible
    const cleanUserCode = userCode.replace(/public\s+class\s+Solution/g, 'class Solution');

    return `${cleanUserCode}

// --- CODERHAVELI AUTOMATIC EXECUTION HARNESS ---
public class Main {
    public static void main(String[] args) throws Exception {
        java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\\n");
        }
        String input = sb.toString().trim();
        java.util.List<String> rawTokens = extractTokens(input);

        Class<?> clazz = Class.forName("Solution");
        Object instance = clazz.getDeclaredConstructor().newInstance();
        java.lang.reflect.Method[] methods = clazz.getDeclaredMethods();
        java.lang.reflect.Method targetMethod = null;
        for (java.lang.reflect.Method m : methods) {
            if (java.lang.reflect.Modifier.isPublic(m.getModifiers()) && !m.getName().startsWith("$")) {
                targetMethod = m;
                break;
            }
        }
        if (targetMethod == null) {
            System.err.println("No public method found in Solution class");
            System.exit(1);
        }

        Class<?>[] paramTypes = targetMethod.getParameterTypes();
        Object[] invokeArgs = new Object[paramTypes.length];
        for (int i = 0; i < paramTypes.length; i++) {
            String token = i < rawTokens.size() ? rawTokens.get(i) : "";
            invokeArgs[i] = convertToken(token, paramTypes[i]);
        }

        Object result = targetMethod.invoke(instance, invokeArgs);
        if (result != null) {
            printResult(result);
        } else if (invokeArgs.length > 0) {
            printResult(invokeArgs[0]);
        }
    }

    private static java.util.List<String> extractTokens(String input) {
        java.util.List<String> tokens = new java.util.ArrayList<>();
        if (input == null || input.isEmpty()) return tokens;

        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(?:^|[\\\\r\\\\n]+|,\\\\s*)([a-zA-Z_][a-zA-Z0-9_]*)\\\\s*=\\\\s*");
        java.util.regex.Matcher m = pattern.matcher(input);
        java.util.List<Integer> starts = new java.util.ArrayList<>();
        java.util.List<Integer> valStarts = new java.util.ArrayList<>();
        while (m.find()) {
            starts.add(m.start());
            valStarts.add(m.end());
        }

        if (starts.isEmpty()) {
            String[] lines = input.split("\\\\r?\\\\n");
            for (String l : lines) {
                if (!l.trim().isEmpty()) tokens.add(l.trim());
            }
            return tokens;
        }

        for (int i = 0; i < starts.size(); i++) {
            int valStart = valStarts.get(i);
            int end = (i + 1 < starts.size()) ? starts.get(i + 1) : input.length();
            String val = input.substring(valStart, end).trim();
            if (val.endsWith(",")) val = val.substring(0, val.length() - 1).trim();
            tokens.add(val);
        }
        return tokens;
    }

    private static Object convertToken(String token, Class<?> type) {
        token = token.trim();
        if (type == int.class || type == Integer.class) {
            return Integer.parseInt(token);
        } else if (type == long.class || type == Long.class) {
            return Long.parseLong(token);
        } else if (type == double.class || type == Double.class) {
            return Double.parseDouble(token);
        } else if (type == boolean.class || type == Boolean.class) {
            return Boolean.parseBoolean(token);
        } else if (type == String.class) {
            if (token.startsWith("\\"") && token.endsWith("\\"") && token.length() >= 2) {
                return token.substring(1, token.length() - 1);
            }
            return token;
        } else if (type == int[].class) {
            String clean = token.replaceAll("[\\\\[\\\\]\\\\s]", "");
            if (clean.isEmpty()) return new int[0];
            String[] parts = clean.split(",");
            int[] arr = new int[parts.length];
            for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
            return arr;
        } else if (type == String[].class) {
            String clean = token.replaceAll("[\\\\[\\\\]]", "").trim();
            if (clean.isEmpty()) return new String[0];
            String[] parts = clean.split(",");
            String[] arr = new String[parts.length];
            for (int i = 0; i < parts.length; i++) {
                String p = parts[i].trim();
                if (p.startsWith("\\"") && p.endsWith("\\"") && p.length() >= 2) {
                    p = p.substring(1, p.length() - 1);
                }
                arr[i] = p;
            }
            return arr;
        }
        return token;
    }

    private static void printResult(Object result) {
        if (result instanceof int[]) {
            System.out.println(java.util.Arrays.toString((int[]) result).replace(" ", ""));
        } else if (result instanceof long[]) {
            System.out.println(java.util.Arrays.toString((long[]) result).replace(" ", ""));
        } else if (result instanceof boolean[]) {
            System.out.println(java.util.Arrays.toString((boolean[]) result).replace(" ", ""));
        } else if (result instanceof Object[]) {
            System.out.println(java.util.Arrays.toString((Object[]) result).replace(" ", ""));
        } else if (result instanceof Boolean) {
            System.out.println(((Boolean) result) ? "true" : "false");
        } else {
            System.out.println(result.toString());
        }
    }
}
`;
}

/**
 * Universal C++ Harness
 */
function buildCppHarness(userCode, fnName) {
    return `${userCode}

// --- CODERHAVELI AUTOMATIC EXECUTION HARNESS ---
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <regex>

static std::vector<std::string> extractCppTokens(const std::string& input) {
    std::vector<std::string> tokens;
    std::regex re("(?:^|[\\r\\n]+|,\\s*)([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*");
    std::sregex_iterator next(input.begin(), input.end(), re);
    std::sregex_iterator end;
    std::vector<int> starts;
    std::vector<int> valStarts;

    while (next != end) {
        std::smatch match = *next;
        starts.push_back(match.position());
        valStarts.push_back(match.position() + match.length());
        next++;
    }

    if (starts.empty()) {
        std::stringstream ss(input);
        std::string line;
        while (std::getline(ss, line)) {
            while (!line.empty() && (line.back() == '\\r' || line.back() == ' ')) line.pop_back();
            if (!line.empty()) tokens.push_back(line);
        }
        return tokens;
    }

    for (size_t i = 0; i < starts.size(); ++i) {
        size_t valStart = valStarts[i];
        size_t endPos = (i + 1 < starts.size()) ? starts[i + 1] : input.length();
        std::string val = input.substr(valStart, endPos - valStart);
        while (!val.empty() && (val.back() == ' ' || val.back() == '\\n' || val.back() == '\\r' || val.back() == ',')) {
            val.pop_back();
        }
        size_t first = val.find_first_not_of(" \\t\\r\\n");
        if (first != std::string::npos) val = val.substr(first);
        tokens.push_back(val);
    }
    return tokens;
}

static std::vector<int> parseVectorInt(const std::string& s) {
    std::vector<int> res;
    int curr = 0;
    bool inNum = false;
    bool neg = false;
    for (char c : s) {
        if (c == '-') {
            neg = true;
        } else if (c >= '0' && c <= '9') {
            inNum = true;
            curr = curr * 10 + (c - '0');
        } else {
            if (inNum) {
                res.push_back(neg ? -curr : curr);
                curr = 0;
                inNum = false;
                neg = false;
            }
        }
    }
    if (inNum) res.push_back(neg ? -curr : curr);
    return res;
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);
    std::string fullInput;
    std::string line;
    while (std::getline(std::cin, line)) {
        fullInput += line + "\\n";
    }

    std::vector<std::string> tokens = extractCppTokens(fullInput);
    Solution sol;

    // Default driver runner
    return 0;
}
`;
}

/**
 * Wraps user code with the appropriate language harness if needed.
 */
codeDriver.wrap = function (code, language) {
    if (!codeDriver.needsDriver(code, language)) {
        return code;
    }

    const lang = (language || '').toLowerCase().trim();
    const fnName = codeDriver.extractFunctionName(code, lang);

    if (lang === 'javascript' || lang === 'js') {
        return buildJsHarness(code, fnName);
    }

    if (lang === 'python' || lang === 'py') {
        return buildPythonHarness(code, fnName);
    }

    if (lang === 'java') {
        return buildJavaHarness(code);
    }

    if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
        return buildCppHarness(code, fnName);
    }

    return code;
};

/**
 * Converts a problem title to camelCase identifier (e.g. "Two Sum" -> "twoSum")
 */
codeDriver.toCamelCase = function (str) {
    if (!str) return 'solution';
    const words = str
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim()
        .split(/\s+/);
    if (!words.length || !words[0]) return 'solution';
    return words.map((w, i) => {
        const l = w.toLowerCase();
        return i === 0 ? l : l.charAt(0).toUpperCase() + l.slice(1);
    }).join('');
};

/**
 * Generates clean starter code for a problem on-the-fly.
 */
codeDriver.generateStarterCode = function (title, language, params = ['nums', 'target']) {
    const lang = (language || '').toLowerCase().trim();
    const fnName = codeDriver.toCamelCase(title) || 'solution';
    const paramList = params.join(', ');

    switch (lang) {
        case 'javascript':
        case 'js':
            return `/**\n * @param {any} ${params.join('\n * @param {any} ')}\n * @return {any}\n */\nfunction ${fnName}(${paramList}) {\n    // Write your code here\n    \n};`;

        case 'python':
        case 'py':
            return `class Solution:\n    def ${fnName}(self, ${paramList}):\n        # Write your code here\n        pass\n`;

        case 'java':
            return `class Solution {\n    public Object ${fnName}(${params.map(p => 'Object ' + p).join(', ')}) {\n        // Write your code here\n        return null;\n    }\n}`;

        case 'cpp':
        case 'c++':
            return `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Write your code here\n};\n`;

        default:
            return `// Write your solution here\n`;
    }
};

module.exports = codeDriver;


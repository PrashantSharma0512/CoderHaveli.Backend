/**
 * editorial.service.js
 * Comprehensive fallback editorial generator for CoderHaveli questions.
 */

function toFunctionName(name) {
    if (!name) return 'solve';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/);
    if (!clean.length || !clean[0]) return 'solve';
    return clean
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
}

const TOP_EDITORIALS = {
    // 11. Container With Most Water
    '11': [
        {
            approachName: 'Brute Force Pair Evaluation',
            approachType: 'Brute Force',
            approachDesc: 'Compute the water area for every possible pair of lines (i, j) where i < j using Area = min(height[i], height[j]) * (j - i), and track the global maximum.',
            time_complexity: '$O(n^2)$',
            space_complexity: '$O(1)$',
            videoUrl: 'https://www.youtube.com/embed/UuiTKBwPgAo',
            order: 1,
            code: {
                javascript: `function maxArea(height) {\n    let maxWater = 0;\n    const n = height.length;\n    for (let i = 0; i < n; i++) {\n        for (let j = i + 1; j < n; j++) {\n            const currentArea = Math.min(height[i], height[j]) * (j - i);\n            maxWater = Math.max(maxWater, currentArea);\n        }\n    }\n    return maxWater;\n}`,
                python: `class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        max_water = 0\n        n = len(height)\n        for i in range(n):\n            for j in range(i + 1, n):\n                current_area = min(height[i], height[j]) * (j - i)\n                max_water = max(max_water, current_area)\n        return max_water`,
                java: `class Solution {\n    public int maxArea(int[] height) {\n        int maxWater = 0;\n        int n = height.length;\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                int currentArea = Math.min(height[i], height[j]) * (j - i);\n                maxWater = Math.max(maxWater, currentArea);\n            }\n        }\n        return maxWater;\n    }\n}`,
                cpp: `class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int maxWater = 0;\n        int n = height.size();\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                int currentArea = min(height[i], height[j]) * (j - i);\n                maxWater = max(maxWater, currentArea);\n            }\n        }\n        return maxWater;\n    }\n};`
            }
        },
        {
            approachName: 'Two Pointers Greedy Contraction',
            approachType: 'Optimised',
            approachDesc: 'Initialize left = 0 and right = height.length - 1. Because the area is strictly bounded by the shorter line, moving the taller line inward will always decrease width while never increasing height. Thus, we always move the shorter line inward.',
            time_complexity: '$O(n)$',
            space_complexity: '$O(1)$',
            videoUrl: 'https://www.youtube.com/embed/UuiTKBwPgAo',
            order: 2,
            code: {
                javascript: `function maxArea(height) {\n    let left = 0, right = height.length - 1;\n    let maxWater = 0;\n    while (left < right) {\n        const width = right - left;\n        const h = Math.min(height[left], height[right]);\n        maxWater = Math.max(maxWater, width * h);\n        if (height[left] < height[right]) left++;\n        else right--;\n    }\n    return maxWater;\n}`,
                python: `class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        left, right = 0, len(height) - 1\n        max_water = 0\n        while left < right:\n            width = right - left\n            h = min(height[left], height[right])\n            max_water = max(max_water, width * h)\n            if height[left] < height[right]:\n                left += 1\n            else:\n                right -= 1\n        return max_water`,
                java: `class Solution {\n    public int maxArea(int[] height) {\n        int left = 0, right = height.length - 1;\n        int maxWater = 0;\n        while (left < right) {\n            int width = right - left;\n            int h = Math.min(height[left], height[right]);\n            maxWater = Math.max(maxWater, width * h);\n            if (height[left] < height[right]) left++;\n            else right--;\n        }\n        return maxWater;\n    }\n}`,
                cpp: `class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int left = 0, right = height.size() - 1;\n        int maxWater = 0;\n        while (left < right) {\n            int width = right - left;\n            int h = min(height[left], height[right]);\n            maxWater = max(maxWater, width * h);\n            if (height[left] < height[right]) left++;\n            else right--;\n        }\n        return maxWater;\n    }\n};`
            }
        }
    ],

    // 1. Two Sum
    '1': [
        {
            approachName: 'Brute Force Pair Check',
            approachType: 'Brute Force',
            approachDesc: 'Iterate through all pairs (i, j) with i < j and check if nums[i] + nums[j] equals target.',
            time_complexity: '$O(n^2)$',
            space_complexity: '$O(1)$',
            order: 1,
            code: {
                javascript: `function twoSum(nums, target) {\n    for (let i = 0; i < nums.length; i++) {\n        for (let j = i + 1; j < nums.length; j++) {\n            if (nums[i] + nums[j] === target) return [i, j];\n        }\n    }\n    return [];\n}`,
                python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        n = len(nums)\n        for i in range(n):\n            for j in range(i + 1, n):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n        return []`,
                java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        for (int i = 0; i < nums.length; i++) {\n            for (int j = i + 1; j < nums.length; j++) {\n                if (nums[i] + nums[j] == target) return new int[]{i, j};\n            }\n        }\n        return new int[]{};\n    }\n}`,
                cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        for (int i = 0; i < nums.size(); i++) {\n            for (int j = i + 1; j < nums.size(); j++) {\n                if (nums[i] + nums[j] == target) return {i, j};\n            }\n        }\n        return {};\n    }\n};`
            }
        },
        {
            approachName: 'One-Pass Hash Map',
            approachType: 'Optimised',
            approachDesc: 'Store visited elements and their indices in a hash map. For each number, check if its complement target - nums[i] has already been seen in constant time.',
            time_complexity: '$O(n)$',
            space_complexity: '$O(n)$',
            order: 2,
            code: {
                javascript: `function twoSum(nums, target) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (seen.has(complement)) return [seen.get(complement), i];\n        seen.set(nums[i], i);\n    }\n    return [];\n}`,
                python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            comp = target - num\n            if comp in seen:\n                return [seen[comp], i]\n            seen[num] = i\n        return []`,
                java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (seen.containsKey(comp)) return new int[]{seen.get(comp), i};\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
                cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < nums.size(); i++) {\n            int comp = target - nums[i];\n            if (seen.find(comp) != seen.end()) return {seen[comp], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`
            }
        }
    ]
};

function generateFallbackEditorial(problem) {
    const quesId = String(problem.quesId || '');
    if (TOP_EDITORIALS[quesId]) {
        return TOP_EDITORIALS[quesId];
    }

    const title = problem.quesName || `Question ${quesId}`;
    const fn = toFunctionName(title);
    const tags = Array.isArray(problem.tags) ? problem.tags.join(' ').toLowerCase() : '';

    let optimalName = 'Optimized Algorithmic Solution';
    let optimalDesc = `Utilize standard patterns for ${problem.tags?.join(', ') || 'this problem'} to achieve linear or near-linear runtime.`;
    let timeComplexity = '$O(n)$';
    let spaceComplexity = '$O(1)$';

    if (tags.includes('two pointer') || tags.includes('sliding window')) {
        optimalName = 'Two Pointers / Sliding Window';
        optimalDesc = 'Maintain window boundaries and contract or expand the pointers monotonically based on the problem condition.';
        timeComplexity = '$O(n)$';
        spaceComplexity = '$O(1)$';
    } else if (tags.includes('binary search')) {
        optimalName = 'Binary Search Partitioning';
        optimalDesc = 'Halve the search space at each iteration by checking the monotonic boundary condition.';
        timeComplexity = '$O(\\log n)$';
        spaceComplexity = '$O(1)$';
    } else if (tags.includes('dynamic programming') || tags.includes('dp')) {
        optimalName = 'Dynamic Programming State Transition';
        optimalDesc = 'Construct recurrence relation dp[i] and avoid redundant subproblem calculations with tabular/memoized storage.';
        timeComplexity = '$O(n)$';
        spaceComplexity = '$O(n)$';
    } else if (tags.includes('hash')) {
        optimalName = 'Hash Map Frequency / Index Lookup';
        optimalDesc = 'Store historical states or frequencies in a hash map to achieve $O(1)$ average query time.';
        timeComplexity = '$O(n)$';
        spaceComplexity = '$O(n)$';
    }

    return [
        {
            approachName: 'Brute Force / Naive Exploration',
            approachType: 'Brute Force',
            approachDesc: `Direct simulation evaluating all possibilities for ${title}. While establishing a correct baseline, this approach suffers from quadratic or exponential runtime.`,
            time_complexity: '$O(n^2)$',
            space_complexity: '$O(1)$',
            order: 1,
            code: {
                javascript: `function ${fn}BruteForce(data) {\n    // Naive search over all candidate configurations\n    for (let i = 0; i < data.length; i++) {\n        for (let j = i + 1; j < data.length; j++) {\n            if (isValid(data[i], data[j])) return [data[i], data[j]];\n        }\n    }\n    return null;\n}`,
                python: `class Solution:\n    def ${fn}_brute_force(self, data: list):\n        n = len(data)\n        for i in range(n):\n            for j in range(i + 1, n):\n                if self.is_valid(data[i], data[j]):\n                    return (data[i], data[j])\n        return None`,
                java: `class Solution {\n    public int ${fn}BruteForce(int[] data) {\n        for (int i = 0; i < data.length; i++) {\n            for (int j = i + 1; j < data.length; j++) {\n                if (isValid(data[i], data[j])) return data[i];\n            }\n        }\n        return -1;\n    }\n}`,
                cpp: `class Solution {\npublic:\n    int ${fn}BruteForce(vector<int>& data) {\n        for (int i = 0; i < data.size(); i++) {\n            for (int j = i + 1; j < data.size(); j++) {\n                if (isValid(data[i], data[j])) return data[i];\n            }\n        }\n        return -1;\n    }\n};`
            }
        },
        {
            approachName: optimalName,
            approachType: 'Optimised',
            approachDesc: optimalDesc,
            time_complexity: timeComplexity,
            space_complexity: spaceComplexity,
            order: 2,
            code: {
                javascript: `function ${fn}(data) {\n    // Optimal solution leveraging algorithmic invariants\n    let result = 0;\n    let left = 0, right = data.length - 1;\n    while (left < right) {\n        result = Math.max(result, compute(data[left], data[right]));\n        if (data[left] < data[right]) left++;\n        else right--;\n    }\n    return result;\n}`,
                python: `class Solution:\n    def ${fn}(self, data: list):\n        result = 0\n        left, right = 0, len(data) - 1\n        while left < right:\n            result = max(result, self.compute(data[left], data[right]))\n            if data[left] < data[right]:\n                left += 1\n            else:\n                right -= 1\n        return result`,
                java: `class Solution {\n    public int ${fn}(int[] data) {\n        int result = 0;\n        int left = 0, right = data.length - 1;\n        while (left < right) {\n            result = Math.max(result, compute(data[left], data[right]));\n            if (data[left] < data[right]) left++;\n            else right--;\n        }\n        return result;\n    }\n}`,
                cpp: `class Solution {\npublic:\n    int ${fn}(vector<int>& data) {\n        int result = 0;\n        int left = 0, right = data.size() - 1;\n        while (left < right) {\n            result = max(result, compute(data[left], data[right]));\n            if (data[left] < data[right]) left++;\n            else right--;\n        }\n        return result;\n    }\n};`
            }
        }
    ];
}

module.exports = {
    generateFallbackEditorial,
    TOP_EDITORIALS
};


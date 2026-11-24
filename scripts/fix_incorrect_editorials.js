/**
 * fix_incorrect_editorials.js
 * Accurately updates approaches for questions 2, 3, 4, 5, 6, 7, 8, 9, 10, 42
 * with verified, production-grade LeetCode editorial solutions in JS, Python, Java, and C++.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/coderhaveli';
require('../models')(mongoose);
const Approaches = mongoose.model('Approaches');

const CORRECT_APPROACHES = {
  // Ques 2: Add Two Numbers
  '2': [
    {
      quesId: '2',
      approachName: 'Elementary Math Simulation with Carry',
      approachType: 'Optimised',
      approachDesc: 'Iterate through both linked lists l1 and l2 simultaneously from head to tail. Sum the corresponding digits along with any carry from the previous position. Create a new ListNode for sum % 10 and propagate carry = Math.floor(sum / 10).',
      time_complexity: '$O(\\max(m, n))$',
      space_complexity: '$O(1)$ auxiliary',
      videoUrl: 'https://www.youtube.com/embed/wgFPrzTjm7s',
      order: 1,
      code: {
        javascript: `function addTwoNumbers(l1, l2) {
    const dummyHead = new ListNode(0);
    let curr = dummyHead;
    let carry = 0;

    while (l1 !== null || l2 !== null || carry !== 0) {
        const val1 = l1 ? l1.val : 0;
        const val2 = l2 ? l2.val : 0;
        const sum = val1 + val2 + carry;
        
        carry = Math.floor(sum / 10);
        curr.next = new ListNode(sum % 10);
        curr = curr.next;

        if (l1) l1 = l1.next;
        if (l2) l2 = l2.next;
    }

    return dummyHead.next;
}`,
        python: `class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        curr = dummy
        carry = 0

        while l1 or l2 or carry:
            val1 = l1.val if l1 else 0
            val2 = l2.val if l2 else 0
            total = val1 + val2 + carry

            carry = total // 10
            curr.next = ListNode(total % 10)
            curr = curr.next

            l1 = l1.next if l1 else None
            l2 = l2.next if l2 else None

        return dummy.next`,
        java: `class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        int carry = 0;

        while (l1 != null || l2 != null || carry != 0) {
            int val1 = (l1 != null) ? l1.val : 0;
            int val2 = (l2 != null) ? l2.val : 0;
            int sum = val1 + val2 + carry;

            carry = sum / 10;
            curr.next = new ListNode(sum % 10);
            curr = curr.next;

            if (l1 != null) l1 = l1.next;
            if (l2 != null) l2 = l2.next;
        }

        return dummy.next;
    }
}`,
        cpp: `class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0);
        ListNode* curr = &dummy;
        int carry = 0;

        while (l1 || l2 || carry) {
            int val1 = l1 ? l1->val : 0;
            int val2 = l2 ? l2->val : 0;
            int sum = val1 + val2 + carry;

            carry = sum / 10;
            curr->next = new ListNode(sum % 10);
            curr = curr->next;

            if (l1) l1 = l1->next;
            if (l2) l2 = l2->next;
        }

        return dummy.next;
    }
};`
      }
    }
  ],

  // Ques 3: Longest Substring Without Repeating Characters
  '3': [
    {
      quesId: '3',
      approachName: 'Sliding Window with Hash Set',
      approachType: 'Improved',
      approachDesc: 'Use a sliding window [left, right] and a set to store visited characters. If s[right] is already in the set, shrink the window from left by deleting s[left] and incrementing left until s[right] is removed, then add s[right] and update maximum length.',
      time_complexity: '$O(2n) = O(n)$',
      space_complexity: '$O(\\min(m, n))$',
      videoUrl: 'https://www.youtube.com/embed/wiGpQwVHdE0',
      order: 1,
      code: {
        javascript: `function lengthOfLongestSubstring(s) {
    const charSet = new Set();
    let left = 0;
    let maxLength = 0;

    for (let right = 0; right < s.length; right++) {
        while (charSet.has(s[right])) {
            charSet.delete(s[left]);
            left++;
        }
        charSet.add(s[right]);
        maxLength = Math.max(maxLength, right - left + 1);
    }

    return maxLength;
}`,
        python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        char_set = set()
        left = 0
        max_len = 0

        for right in range(len(s)):
            while s[right] in char_set:
                char_set.remove(s[left])
                left += 1
            char_set.add(s[right])
            max_len = max(max_len, right - left + 1)

        return max_len`,
        java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Set<Character> set = new HashSet<>();
        int left = 0, maxLen = 0;

        for (int right = 0; right < s.length(); right++) {
            while (set.contains(s.charAt(right))) {
                set.remove(s.charAt(left));
                left++;
            }
            set.add(s.charAt(right));
            maxLen = Math.max(maxLen, right - left + 1);
        }

        return maxLen;
    }
}`,
        cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_set<char> charSet;
        int left = 0, maxLen = 0;

        for (int right = 0; right < s.size(); right++) {
            while (charSet.count(s[right])) {
                charSet.erase(s[left]);
                left++;
            }
            charSet.insert(s[right]);
            maxLen = max(maxLen, right - left + 1);
        }

        return maxLen;
    }
};`
      }
    },
    {
      quesId: '3',
      approachName: 'Sliding Window Optimized with Last-Seen Index Map',
      approachType: 'Optimised',
      approachDesc: 'Instead of removing characters one by one, store the last observed index of each character in a map. When a repeated character is encountered, skip left directly to max(left, lastSeenIndex + 1).',
      time_complexity: '$O(n)$',
      space_complexity: '$O(\\min(m, n))$',
      videoUrl: 'https://www.youtube.com/embed/wiGpQwVHdE0',
      order: 2,
      code: {
        javascript: `function lengthOfLongestSubstring(s) {
    const lastSeen = new Map();
    let left = 0;
    let maxLength = 0;

    for (let right = 0; right < s.length; right++) {
        const char = s[right];
        if (lastSeen.has(char) && lastSeen.get(char) >= left) {
            left = lastSeen.get(char) + 1;
        }
        lastSeen.set(char, right);
        maxLength = Math.max(maxLength, right - left + 1);
    }

    return maxLength;
}`,
        python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last_seen = {}
        left = 0
        max_len = 0

        for right, char in enumerate(s):
            if char in last_seen and last_seen[char] >= left:
                left = last_seen[char] + 1
            last_seen[char] = right
            max_len = max(max_len, right - left + 1)

        return max_len`,
        java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0, maxLen = 0;

        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
                left = lastSeen.get(c) + 1;
            }
            lastSeen.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }

        return maxLen;
    }
}`,
        cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char, int> lastSeen;
        int left = 0, maxLen = 0;

        for (int right = 0; right < s.size(); right++) {
            char c = s[right];
            if (lastSeen.count(c) && lastSeen[c] >= left) {
                left = lastSeen[c] + 1;
            }
            lastSeen[c] = right;
            maxLen = max(maxLen, right - left + 1);
        }

        return maxLen;
    }
};`
      }
    }
  ],

  // Ques 4: Median of Two Sorted Arrays
  '4': [
    {
      quesId: '4',
      approachName: 'Binary Search Partition on Smaller Array',
      approachType: 'Optimised',
      approachDesc: 'Perform binary search on the partition cut of the smaller array. Partition both nums1 and nums2 such that the left half and right half have equal lengths and max(LeftPart) <= min(RightPart).',
      time_complexity: '$O(\\log(\\min(m, n)))$',
      space_complexity: '$O(1)$',
      videoUrl: 'https://www.youtube.com/embed/q6IEA26hvPE',
      order: 1,
      code: {
        javascript: `function findMedianSortedArrays(nums1, nums2) {
    if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);

    const m = nums1.length;
    const n = nums2.length;
    let low = 0, high = m;

    while (low <= high) {
        const partition1 = Math.floor((low + high) / 2);
        const partition2 = Math.floor((m + n + 1) / 2) - partition1;

        const maxLeft1 = partition1 === 0 ? -Infinity : nums1[partition1 - 1];
        const minRight1 = partition1 === m ? Infinity : nums1[partition1];

        const maxLeft2 = partition2 === 0 ? -Infinity : nums2[partition2 - 1];
        const minRight2 = partition2 === n ? Infinity : nums2[partition2];

        if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
            if ((m + n) % 2 === 0) {
                return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2;
            } else {
                return Math.max(maxLeft1, maxLeft2);
            }
        } else if (maxLeft1 > minRight2) {
            high = partition1 - 1;
        } else {
            low = partition1 + 1;
        }
    }

    return 0.0;
}`,
        python: `class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        if len(nums1) > len(nums2):
            return self.findMedianSortedArrays(nums2, nums1)

        m, n = len(nums1), len(nums2)
        low, high = 0, m

        while low <= high:
            part1 = (low + high) // 2
            part2 = (m + n + 1) // 2 - part1

            max_left1 = float('-inf') if part1 == 0 else nums1[part1 - 1]
            min_right1 = float('inf') if part1 == m else nums1[part1]

            max_left2 = float('-inf') if part2 == 0 else nums2[part2 - 1]
            min_right2 = float('inf') if part2 == n else nums2[part2]

            if max_left1 <= min_right2 and max_left2 <= min_right1:
                if (m + n) % 2 == 0:
                    return (max(max_left1, max_left2) + min(min_right1, min_right2)) / 2.0
                else:
                    return float(max(max_left1, max_left2))
            elif max_left1 > min_right2:
                high = part1 - 1
            else:
                low = part1 + 1

        return 0.0`,
        java: `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);

        int m = nums1.length, n = nums2.length;
        int low = 0, high = m;

        while (low <= high) {
            int part1 = (low + high) / 2;
            int part2 = (m + n + 1) / 2 - part1;

            int maxLeft1 = (part1 == 0) ? Integer.MIN_VALUE : nums1[part1 - 1];
            int minRight1 = (part1 == m) ? Integer.MAX_VALUE : nums1[part1];

            int maxLeft2 = (part2 == 0) ? Integer.MIN_VALUE : nums2[part2 - 1];
            int minRight2 = (part2 == n) ? Integer.MAX_VALUE : nums2[part2];

            if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
                if ((m + n) % 2 == 0) {
                    return ((double)Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2;
                } else {
                    return (double)Math.max(maxLeft1, maxLeft2);
                }
            } else if (maxLeft1 > minRight2) {
                high = part1 - 1;
            } else {
                low = part1 + 1;
            }
        }
        return 0.0;
    }
}`,
        cpp: `class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        if (nums1.size() > nums2.size()) return findMedianSortedArrays(nums2, nums1);

        int m = nums1.size(), n = nums2.size();
        int low = 0, high = m;

        while (low <= high) {
            int part1 = (low + high) / 2;
            int part2 = (m + n + 1) / 2 - part1;

            int maxLeft1 = (part1 == 0) ? INT_MIN : nums1[part1 - 1];
            int minRight1 = (part1 == m) ? INT_MAX : nums1[part1];

            int maxLeft2 = (part2 == 0) ? INT_MIN : nums2[part2 - 1];
            int minRight2 = (part2 == n) ? INT_MAX : nums2[part2];

            if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
                if ((m + n) % 2 == 0) {
                    return (max(maxLeft1, maxLeft2) + min(minRight1, minRight2)) / 2.0;
                } else {
                    return max(maxLeft1, maxLeft2);
                }
            } else if (maxLeft1 > minRight2) {
                high = part1 - 1;
            } else {
                low = part1 + 1;
            }
        }
        return 0.0;
    }
};`
      }
    }
  ],

  // Ques 5: Longest Palindromic Substring
  '5': [
    {
      quesId: '5',
      approachName: 'Expand Around Center',
      approachType: 'Optimised',
      approachDesc: 'A palindrome mirrors around its center. There are 2n - 1 potential centers (n single-character centers and n - 1 between-character centers). Expand outward from each center while characters match and track the longest valid slice.',
      time_complexity: '$O(n^2)$',
      space_complexity: '$O(1)$',
      videoUrl: 'https://www.youtube.com/embed/XYQecbcd6fY',
      order: 1,
      code: {
        javascript: `function longestPalindrome(s) {
    if (!s || s.length <= 1) return s;
    let start = 0, maxLen = 1;

    function expandAroundCenter(left, right) {
        while (left >= 0 && right < s.length && s[left] === s[right]) {
            left--;
            right++;
        }
        return right - left - 1;
    }

    for (let i = 0; i < s.length; i++) {
        const len1 = expandAroundCenter(i, i);
        const len2 = expandAroundCenter(i, i + 1);
        const len = Math.max(len1, len2);
        if (len > maxLen) {
            maxLen = len;
            start = i - Math.floor((len - 1) / 2);
        }
    }

    return s.substring(start, start + maxLen);
}`,
        python: `class Solution:
    def longestPalindrome(self, s: str) -> str:
        if not s or len(s) <= 1:
            return s
        
        start, max_len = 0, 1

        def expand(left: int, right: int) -> int:
            while left >= 0 and right < len(s) and s[left] == s[right]:
                left -= 1
                right += 1
            return right - left - 1

        for i in range(len(s)):
            len1 = expand(i, i)
            len2 = expand(i, i + 1)
            cur_len = max(len1, len2)
            if cur_len > max_len:
                max_len = cur_len
                start = i - (cur_len - 1) // 2

        return s[start:start + max_len]`,
        java: `class Solution {
    public String longestPalindrome(String s) {
        if (s == null || s.length() <= 1) return s;
        int start = 0, maxLen = 1;

        for (int i = 0; i < s.length(); i++) {
            int len1 = expand(s, i, i);
            int len2 = expand(s, i, i + 1);
            int len = Math.max(len1, len2);
            if (len > maxLen) {
                maxLen = len;
                start = i - (len - 1) / 2;
            }
        }
        return s.substring(start, start + maxLen);
    }

    private int expand(String s, int left, int right) {
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            left--;
            right++;
        }
        return right - left - 1;
    }
}`,
        cpp: `class Solution {
public:
    string longestPalindrome(string s) {
        if (s.empty()) return "";
        int start = 0, maxLen = 1;

        auto expand = [&](int left, int right) {
            while (left >= 0 && right < (int)s.size() && s[left] == s[right]) {
                left--;
                right++;
            }
            return right - left - 1;
        };

        for (int i = 0; i < (int)s.size(); i++) {
            int len1 = expand(i, i);
            int len2 = expand(i, i + 1);
            int len = max(len1, len2);
            if (len > maxLen) {
                maxLen = len;
                start = i - (len - 1) / 2;
            }
        }
        return s.substr(start, maxLen);
    }
};`
      }
    }
  ],

  // Ques 6: Zigzag Conversion
  '6': [
    {
      quesId: '6',
      approachName: 'Row Simulation with Direction Toggle',
      approachType: 'Optimised',
      approachDesc: 'Create an array of numRows strings. Iterate through the input string, appending each character to the current row, and reverse direction (goingDown = !goingDown) whenever reaching row 0 or numRows - 1.',
      time_complexity: '$O(n)$',
      space_complexity: '$O(n)$',
      order: 1,
      code: {
        javascript: `function convert(s, numRows) {
    if (numRows === 1 || s.length <= numRows) return s;

    const rows = Array.from({ length: numRows }, () => '');
    let currRow = 0;
    let goingDown = false;

    for (const char of s) {
        rows[currRow] += char;
        if (currRow === 0 || currRow === numRows - 1) {
            goingDown = !goingDown;
        }
        currRow += goingDown ? 1 : -1;
    }

    return rows.join('');
}`,
        python: `class Solution:
    def convert(self, s: str, numRows: int) -> str:
        if numRows == 1 or len(s) <= numRows:
            return s
        
        rows = [''] * numRows
        curr_row = 0
        going_down = False

        for char in s:
            rows[curr_row] += char
            if curr_row == 0 or curr_row == numRows - 1:
                going_down = not going_down
            curr_row += 1 if going_down else -1

        return ''.join(rows)`,
        java: `class Solution {
    public String convert(String s, int numRows) {
        if (numRows == 1 || s.length() <= numRows) return s;

        StringBuilder[] rows = new StringBuilder[numRows];
        for (int i = 0; i < numRows; i++) rows[i] = new StringBuilder();

        int currRow = 0;
        boolean goingDown = false;

        for (char c : s.toCharArray()) {
            rows[currRow].append(c);
            if (currRow == 0 || currRow == numRows - 1) goingDown = !goingDown;
            currRow += goingDown ? 1 : -1;
        }

        StringBuilder result = new StringBuilder();
        for (StringBuilder row : rows) result.append(row);
        return result.toString();
    }
}`,
        cpp: `class Solution {
public:
    string convert(string s, int numRows) {
        if (numRows == 1 || (int)s.size() <= numRows) return s;

        vector<string> rows(numRows);
        int currRow = 0;
        bool goingDown = false;

        for (char c : s) {
            rows[currRow] += c;
            if (currRow == 0 || currRow == numRows - 1) goingDown = !goingDown;
            currRow += goingDown ? 1 : -1;
        }

        string result;
        for (const auto& r : rows) result += r;
        return result;
    }
};`
      }
    }
  ],

  // Ques 7: Reverse Integer
  '7': [
    {
      quesId: '7',
      approachName: 'Digit Extraction with 32-Bit Overflow Check',
      approachType: 'Optimised',
      approachDesc: 'Repeatedly pop the last digit x % 10 and push it to the reversed result rev = rev * 10 + pop. Before pushing, verify that rev does not exceed 2^31 - 1 or fall below -2^31.',
      time_complexity: '$O(\\log_{10} |x|)$',
      space_complexity: '$O(1)$',
      order: 1,
      code: {
        javascript: `function reverse(x) {
    const INT_MAX = 2147483647;
    const INT_MIN = -2147483648;
    let rev = 0;

    while (x !== 0) {
        const pop = x % 10;
        x = (x / 10) | 0;

        if (rev > Math.floor(INT_MAX / 10) || (rev === Math.floor(INT_MAX / 10) && pop > 7)) return 0;
        if (rev < Math.ceil(INT_MIN / 10) || (rev === Math.ceil(INT_MIN / 10) && pop < -8)) return 0;

        rev = rev * 10 + pop;
    }

    return rev;
}`,
        python: `class Solution:
    def reverse(self, x: int) -> int:
        INT_MAX = 2**31 - 1
        INT_MIN = -2**31
        
        sign = -1 if x < 0 else 1
        x = abs(x)
        rev = 0
        
        while x != 0:
            pop = x % 10
            x //= 10
            rev = rev * 10 + pop

        rev *= sign
        if rev < INT_MIN or rev > INT_MAX:
            return 0
        return rev`,
        java: `class Solution {
    public int reverse(int x) {
        int rev = 0;
        while (x != 0) {
            int pop = x % 10;
            x /= 10;
            if (rev > Integer.MAX_VALUE / 10 || (rev == Integer.MAX_VALUE / 10 && pop > 7)) return 0;
            if (rev < Integer.MIN_VALUE / 10 || (rev == Integer.MIN_VALUE / 10 && pop < -8)) return 0;
            rev = rev * 10 + pop;
        }
        return rev;
    }
}`,
        cpp: `class Solution {
public:
    int reverse(int x) {
        int rev = 0;
        while (x != 0) {
            int pop = x % 10;
            x /= 10;
            if (rev > INT_MAX / 10 || (rev == INT_MAX / 10 && pop > 7)) return 0;
            if (rev < INT_MIN / 10 || (rev == INT_MIN / 10 && pop < -8)) return 0;
            rev = rev * 10 + pop;
        }
        return rev;
    }
};`
      }
    }
  ],

  // Ques 8: String to Integer (atoi)
  '8': [
    {
      quesId: '8',
      approachName: 'State Machine / Sequential Parsing',
      approachType: 'Optimised',
      approachDesc: 'Parse the string in four sequential steps: (1) skip leading whitespace, (2) inspect optional + or - sign, (3) read consecutive digits, clamping to [-2^31, 2^31 - 1] on 32-bit overflow, and (4) stop at the first non-digit character.',
      time_complexity: '$O(n)$',
      space_complexity: '$O(1)$',
      videoUrl: 'https://www.youtube.com/embed/2I9rUCjnbhs',
      order: 1,
      code: {
        javascript: `function myAtoi(s) {
    const INT_MAX = 2147483647;
    const INT_MIN = -2147483648;
    let i = 0;
    const n = s.length;

    // 1. Whitespace
    while (i < n && s[i] === ' ') i++;
    if (i >= n) return 0;

    // 2. Sign
    let sign = 1;
    if (s[i] === '+' || s[i] === '-') {
        sign = s[i] === '-' ? -1 : 1;
        i++;
    }

    // 3. Digits & Clamp
    let result = 0;
    while (i < n && s[i] >= '0' && s[i] <= '9') {
        const digit = s.charCodeAt(i) - 48;
        if (result > Math.floor(INT_MAX / 10) || (result === Math.floor(INT_MAX / 10) && digit > 7)) {
            return sign === 1 ? INT_MAX : INT_MIN;
        }
        result = result * 10 + digit;
        i++;
    }

    return result * sign;
}`,
        python: `class Solution:
    def myAtoi(self, s: str) -> int:
        INT_MAX = 2**31 - 1
        INT_MIN = -2**31
        
        i = 0
        n = len(s)
        
        while i < n and s[i] == ' ':
            i += 1
        if i >= n:
            return 0
        
        sign = 1
        if s[i] in ['+', '-']:
            sign = -1 if s[i] == '-' else 1
            i += 1
            
        result = 0
        while i < n and s[i].isdigit():
            digit = int(s[i])
            if result > INT_MAX // 10 or (result == INT_MAX // 10 and digit > 7):
                return INT_MAX if sign == 1 else INT_MIN
            result = result * 10 + digit
            i += 1
            
        return sign * result`,
        java: `class Solution {
    public int myAtoi(String s) {
        int i = 0, n = s.length();
        while (i < n && s.charAt(i) == ' ') i++;
        if (i >= n) return 0;

        int sign = 1;
        if (s.charAt(i) == '+' || s.charAt(i) == '-') {
            sign = (s.charAt(i) == '-') ? -1 : 1;
            i++;
        }

        int result = 0;
        while (i < n && Character.isDigit(s.charAt(i))) {
            int digit = s.charAt(i) - '0';
            if (result > Integer.MAX_VALUE / 10 || (result == Integer.MAX_VALUE / 10 && digit > 7)) {
                return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;
            }
            result = result * 10 + digit;
            i++;
        }

        return result * sign;
    }
}`,
        cpp: `class Solution {
public:
    int myAtoi(string s) {
        int i = 0, n = s.size();
        while (i < n && s[i] == ' ') i++;
        if (i >= n) return 0;

        int sign = 1;
        if (s[i] == '+' || s[i] == '-') {
            sign = (s[i] == '-') ? -1 : 1;
            i++;
        }

        int result = 0;
        while (i < n && isdigit(s[i])) {
            int digit = s[i] - '0';
            if (result > INT_MAX / 10 || (result == INT_MAX / 10 && digit > 7)) {
                return sign == 1 ? INT_MAX : INT_MIN;
            }
            result = result * 10 + digit;
            i++;
        }

        return result * sign;
    }
};`
      }
    }
  ],

  // Ques 9: Palindrome Number
  '9': [
    {
      quesId: '9',
      approachName: 'Revert Half of the Number',
      approachType: 'Optimised',
      approachDesc: 'Negative numbers and numbers ending in 0 (except 0 itself) cannot be palindromes. Revert only the second half of the number to avoid 32-bit integer overflow, then compare x == revertedNumber (even length) or x == revertedNumber / 10 (odd length).',
      time_complexity: '$O(\\log_{10} n)$',
      space_complexity: '$O(1)$',
      order: 1,
      code: {
        javascript: `function isPalindrome(x) {
    if (x < 0 || (x % 10 === 0 && x !== 0)) return false;

    let revertedNumber = 0;
    while (x > revertedNumber) {
        revertedNumber = revertedNumber * 10 + (x % 10);
        x = Math.floor(x / 10);
    }

    return x === revertedNumber || x === Math.floor(revertedNumber / 10);
}`,
        python: `class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0 or (x % 10 == 0 and x != 0):
            return False
        
        reverted = 0
        while x > reverted:
            reverted = reverted * 10 + (x % 10)
            x //= 10
            
        return x == reverted or x == reverted // 10`,
        java: `class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;

        int revertedNumber = 0;
        while (x > revertedNumber) {
            revertedNumber = revertedNumber * 10 + (x % 10);
            x /= 10;
        }

        return x == revertedNumber || x == revertedNumber / 10;
    }
}`,
        cpp: `class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;

        int revertedNumber = 0;
        while (x > revertedNumber) {
            revertedNumber = revertedNumber * 10 + (x % 10);
            x /= 10;
        }

        return x == revertedNumber || x == revertedNumber / 10;
    }
};`
      }
    }
  ],

  // Ques 10: Regular Expression Matching
  '10': [
    {
      quesId: '10',
      approachName: 'Dynamic Programming (2D Table)',
      approachType: 'Optimised',
      approachDesc: 'Let dp[i][j] represent whether s[0..i-1] matches pattern p[0..j-1]. If p[j-1] is *, it can match zero of preceding character (dp[i][j-2]) or one/more if s[i-1] matches p[j-2] (dp[i-1][j]). If p[j-1] is . or matches s[i-1], dp[i][j] = dp[i-1][j-1].',
      time_complexity: '$O(m \\times n)$',
      space_complexity: '$O(m \\times n)$',
      order: 1,
      code: {
        javascript: `function isMatch(s, p) {
    const m = s.length, n = p.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;

    for (let j = 2; j <= n; j += 2) {
        if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (p[j - 1] === '*') {
                dp[i][j] = dp[i][j - 2] || ((p[j - 2] === '.' || p[j - 2] === s[i - 1]) && dp[i - 1][j]);
            } else if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
        }
    }

    return dp[m][n];
}`,
        python: `class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        m, n = len(s), len(p)
        dp = [[False] * (n + 1) for _ in range(m + 1)]
        dp[0][0] = True

        for j in range(2, n + 1):
            if p[j - 1] == '*':
                dp[0][j] = dp[0][j - 2]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if p[j - 1] == '*':
                    dp[i][j] = dp[i][j - 2] or ((p[j - 2] == '.' or p[j - 2] == s[i - 1]) and dp[i - 1][j])
                elif p[j - 1] == '.' or p[j - 1] == s[i - 1]:
                    dp[i][j] = dp[i - 1][j - 1]

        return dp[m][n]`,
        java: `class Solution {
    public boolean isMatch(String s, String p) {
        int m = s.length(), n = p.length();
        boolean[][] dp = new boolean[m + 1][n + 1];
        dp[0][0] = true;

        for (int j = 2; j <= n; j++) {
            if (p.charAt(j - 1) == '*') dp[0][j] = dp[0][j - 2];
        }

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (p.charAt(j - 1) == '*') {
                    dp[i][j] = dp[i][j - 2] || ((p.charAt(j - 2) == '.' || p.charAt(j - 2) == s.charAt(i - 1)) && dp[i - 1][j]);
                } else if (p.charAt(j - 1) == '.' || p.charAt(j - 1) == s.charAt(i - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
}`,
        cpp: `class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[0][0] = true;

        for (int j = 2; j <= n; j++) {
            if (p[j - 1] == '*') dp[0][j] = dp[0][j - 2];
        }

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (p[j - 1] == '*') {
                    dp[i][j] = dp[i][j - 2] || ((p[j - 2] == '.' || p[j - 2] == s[i - 1]) && dp[i - 1][j]);
                } else if (p[j - 1] == '.' || p[j - 1] == s[i - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
};`
      }
    }
  ],

  // Ques 42: Trapping Rain Water
  '42': [
    {
      quesId: '42',
      approachName: 'Two Pointers Trapping Optimal',
      approachType: 'Optimised',
      approachDesc: 'Maintain left and right pointers with leftMax and rightMax. Water trapped at height[i] is min(leftMax, rightMax) - height[i]. Since the boundary with smaller max limits the water column height, process that side and move inward.',
      time_complexity: '$O(n)$',
      space_complexity: '$O(1)$',
      videoUrl: 'https://www.youtube.com/embed/ZI2z5830MT8',
      order: 1,
      code: {
        javascript: `function trap(height) {
    let left = 0, right = height.length - 1;
    let leftMax = 0, rightMax = 0;
    let water = 0;

    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                water += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                water += rightMax - height[right];
            }
            right--;
        }
    }

    return water;
}`,
        python: `class Solution:
    def trap(self, height: list[int]) -> int:
        left, right = 0, len(height) - 1
        left_max, right_max = 0, 0
        water = 0

        while left < right:
            if height[left] < height[right]:
                if height[left] >= left_max:
                    left_max = height[left]
                else:
                    water += left_max - height[left]
                left += 1
            else:
                if height[right] >= right_max:
                    right_max = height[right]
                else:
                    water += right_max - height[right]
                right -= 1

        return water`,
        java: `class Solution {
    public int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0;
        int water = 0;

        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) {
                    leftMax = height[left];
                } else {
                    water += leftMax - height[left];
                }
                left++;
            } else {
                if (height[right] >= rightMax) {
                    rightMax = height[right];
                } else {
                    water += rightMax - height[right];
                }
                right--;
            }
        }

        return water;
    }
}`,
        cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        int left = 0, right = height.size() - 1;
        int leftMax = 0, rightMax = 0;
        int water = 0;

        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) {
                    leftMax = height[left];
                } else {
                    water += leftMax - height[left];
                }
                left++;
            } else {
                if (height[right] >= rightMax) {
                    rightMax = height[right];
                } else {
                    water += rightMax - height[right];
                }
                right--;
            }
        }

        return water;
    }
};`
      }
    }
  ]
};

async function fixIncorrectEditorials() {
  console.log('Connecting to MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.');

  const targetIds = Object.keys(CORRECT_APPROACHES);
  console.log('Target questions to fix:', targetIds);

  for (const qId of targetIds) {
    const deleted = await Approaches.deleteMany({ quesId: qId });
    const docs = CORRECT_APPROACHES[qId];
    await Approaches.insertMany(docs);
    console.log('✅ Ques ' + qId + ': Replaced ' + deleted.deletedCount + ' old approaches with ' + docs.length + ' correct approaches.');
  }

  console.log('\nAll targeted questions have been updated with exact, correct editorial approaches.');
  await mongoose.disconnect();
}

fixIncorrectEditorials().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

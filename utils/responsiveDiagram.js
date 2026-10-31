/**
 * Responsive HTML Architecture Diagram Utility for Newsletters
 * 
 * Provides bulletproof, 100% mobile-responsive HTML/CSS architectural schematics
 * for System Design & Node.js engineering newsletters.
 * 
 * Why this is necessary:
 * - Over 75% of newsletter readers open emails on mobile phones (360px - 414px width).
 * - Fixed-width ASCII diagrams in <pre> tags overflow horizontally, forcing awkward
 *   pinch-zooming or causing box-drawing characters to wrap and shatter.
 * - This utility generates structured, card-based architectural flows that adapt
 *   fluidly to any screen width while maintaining the clean, technical, high-aesthetic
 *   schematic look of engineering architecture diagrams with CoderHaveli's White & Golden branding.
 */

/**
 * Render a single responsive step/tier card
 */
function renderTierNode({
    tierLabel,
    protocolBadge,
    title,
    description,
    badgeColor = "#A67C00",
    badgeBg = "#FFF9E8",
    badgeBorder = "#E8D79A",
    borderColor = "#D4AF37",
    cardBg = "#FFFFFF"
}) {
    return `
    <div style="background: ${cardBg}; border: 1.5px solid #E8D79A; border-left: 4px solid ${borderColor}; border-radius: 6px; padding: 10px 14px; margin-bottom: 0; box-shadow: 0 1px 3px rgba(212,175,55,0.06);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
        <tr>
          <td align="left" style="font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; font-weight: 700; color: ${badgeColor}; letter-spacing: 0.5px;">
            ${tierLabel || "[ COMPONENT ]"}
          </td>
          ${protocolBadge ? `
          <td align="right">
            <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; border-radius: 10px; padding: 1px 7px; font-size: 9.5px; font-family: 'Consolas', monospace; font-weight: 700; display: inline-block;">
              ${protocolBadge}
            </span>
          </td>` : ""}
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #222222; line-height: 1.3;">
            ${title}
          </td>
        </tr>
        ${description ? `
        <tr>
          <td colspan="2" style="padding-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11.5px; color: #555555; line-height: 1.45;">
            ${description}
          </td>
        </tr>` : ""}
      </table>
    </div>`;
}

/**
 * Render a directional flow connector with technical routing annotation
 */
function renderFlowConnector(label = "↓") {
    return `
    <div style="text-align: center; padding: 5px 0;">
      <div style="display: inline-block; padding: 2px 10px; background: #FFF9E8; border: 1px dashed #D4AF37; border-radius: 12px; font-family: 'Consolas', 'Courier New', monospace; font-size: 10px; font-weight: 700; color: #A67C00;">
        ${label}
      </div>
    </div>`;
}

/**
 * Render a dual-branch split tier (e.g., Cache Hit vs Miss, or Fast vs Slow path)
 */
function renderBranchTier({
    leftBranch: { label: leftLabel, title: leftTitle, desc: leftDesc, badge: leftBadge },
    rightBranch: { label: rightLabel, title: rightTitle, desc: rightDesc, badge: rightBadge }
}) {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 2px;">
      <tr>
        <td width="48%" valign="top" style="padding-right: 4px;">
          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-left: 3.5px solid #16A34A; border-radius: 6px; padding: 9px 11px;">
            <div style="font-family: 'Consolas', monospace; font-size: 9.5px; font-weight: 700; color: #166534; letter-spacing: 0.3px;">
              ${leftLabel || "[ PATH A ]"}
            </div>
            <div style="font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; color: #14532D; margin-top: 3px;">
              ${leftTitle}
            </div>
            ${leftDesc ? `<div style="font-size: 11px; color: #15803D; margin-top: 2px; line-height: 1.35;">${leftDesc}</div>` : ""}
          </div>
        </td>
        <td width="48%" valign="top" style="padding-left: 4px;">
          <div style="background: #FFFDF7; border: 1.5px solid #FED7AA; border-left: 3.5px solid #EA580C; border-radius: 6px; padding: 9px 11px;">
            <div style="font-family: 'Consolas', monospace; font-size: 9.5px; font-weight: 700; color: #9A3412; letter-spacing: 0.3px;">
              ${rightLabel || "[ PATH B ]"}
            </div>
            <div style="font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; color: #7C2D12; margin-top: 3px;">
              ${rightTitle}
            </div>
            ${rightDesc ? `<div style="font-size: 11px; color: #C2410C; margin-top: 2px; line-height: 1.35;">${rightDesc}</div>` : ""}
          </div>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate a complete responsive architecture diagram container
 */
function renderResponsiveDiagram({
    title = "System Architecture Flow",
    subtitle = "Mobile-Responsive Architecture Schematic",
    nodes = [],
    asciiFallback = null
}) {
    let nodesHtml = "";

    nodes.forEach((item, index) => {
        if (item.type === "connector") {
            nodesHtml += renderFlowConnector(item.label);
        } else if (item.type === "branch") {
            nodesHtml += renderBranchTier(item);
        } else {
            nodesHtml += renderTierNode(item);
            if (index < nodes.length - 1 && nodes[index + 1].type !== "connector") {
                nodesHtml += renderFlowConnector("↓ Next Downstream Hop");
            }
        }
    });

    let rawAsciiSection = "";
    if (asciiFallback) {
        rawAsciiSection = `
        <details style="margin-top: 12px; font-family: 'Consolas', monospace; font-size: 11px; color: #8A8170;">
          <summary style="cursor: pointer; font-size: 10.5px; color: #A67C00; font-weight: 600; padding: 4px 0;">
            ▶ View Raw Terminal / Monospace ASCII Art
          </summary>
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 6px;">
            <pre style="background: #FFFFFF; border: 1px solid #E8D79A; border-radius: 4px; padding: 10px; font-size: 10px; line-height: 1.3; color: #5a4000; margin: 0; white-space: pre; font-family: 'Consolas', 'Courier New', monospace;">${escapeHtml(asciiFallback)}</pre>
          </div>
        </details>`;
    }

    return `
    <div style="background: #FFFDF7; border: 1px solid #E8D79A; border-radius: 8px; padding: 14px; margin: 16px 0; box-shadow: 0 1px 4px rgba(212,175,55,0.08); max-width: 100%; box-sizing: border-box;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
        <tr>
          <td align="left">
            <span style="font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #A67C00; text-transform: uppercase; letter-spacing: 0.5px;">
              📊 ${title.toUpperCase()}
            </span>
          </td>
          <td align="right">
            <span style="background: #FFF9E8; border: 1px solid #E8D79A; border-radius: 12px; padding: 2px 8px; font-size: 9.5px; font-family: -apple-system, sans-serif; font-weight: 600; color: #8A8170; display: inline-block;">
              📱 Mobile Responsive
            </span>
          </td>
        </tr>
      </table>

      ${nodesHtml}

      ${rawAsciiSection}
    </div>`;
}

/**
 * Converts a text flow like:
 * "[Clients] ──WSS──> [AWS ALB] ──> [Node.js Cluster] ──Pub/Sub──> [Redis Broker]"
 * into a responsive HTML diagram.
 */
function convertTextFlowToResponsiveHtml(flowText, title = "Architecture Pipeline Flow") {
    if (!flowText || typeof flowText !== "string") {
        return "";
    }

    // Split on arrow patterns: ──> or ──WSS──> or ──Pub/Sub──> or -> or --->
    const segments = flowText.split(/──+>|──(.*?)──+>|-->|->/g).filter(Boolean);

    const nodes = [];
    const arrowRegex = /\[(.*?)\]\s*(?:──(.*?)──>|->)?/g;
    let match;
    let lastIndex = 0;

    // Extract all [Box Items]
    const boxMatches = [...flowText.matchAll(/\[(.*?)\]/g)];

    if (boxMatches.length >= 2) {
        for (let i = 0; i < boxMatches.length; i++) {
            const rawText = boxMatches[i][1].trim();

            // Try to extract protocol or role if present
            let tierLabel = `[ STEP ${i + 1} ]`;
            let protocolBadge = "";

            if (i === 0) tierLabel = "[ 1. CLIENT / INGRESS ]";
            else if (i === boxMatches.length - 1) tierLabel = "[ FINAL DESTINATION / STORAGE ]";
            else tierLabel = `[ TIER ${i + 1}: PROCESSING ]`;

            // Detect protocols inside text
            if (/WSS|WebSocket/i.test(rawText)) protocolBadge = "WSS";
            else if (/HTTPS|HTTP/i.test(rawText)) protocolBadge = "HTTPS";
            else if (/gRPC/i.test(rawText)) protocolBadge = "gRPC";
            else if (/Redis|Pub\/Sub/i.test(rawText)) protocolBadge = "REDIS";
            else if (/Kafka/i.test(rawText)) protocolBadge = "KAFKA";
            else if (/Worker|Threads/i.test(rawText)) protocolBadge = "THREADS";

            nodes.push({
                type: "node",
                tierLabel,
                protocolBadge,
                title: rawText,
                description: `Executes hop ${i + 1} in the distributed transaction pipeline.`
            });

            if (i < boxMatches.length - 1) {
                nodes.push({
                    type: "connector",
                    label: `↓ Downstream Hop ${i + 1} → ${i + 2}`
                });
            }
        }

        return renderResponsiveDiagram({
            title,
            nodes,
            asciiFallback: flowText
        });
    }

    // Fallback if not matching bracket boxes
    return renderResponsiveDiagram({
        title,
        nodes: [
            {
                type: "node",
                tierLabel: "[ PIPELINE OVERVIEW ]",
                title: flowText.replace(/[\r\n]+/g, " ").trim(),
                description: "Sequential execution topology"
            }
        ],
        asciiFallback: flowText
    });
}

/**
 * Post-processor for generated newsletter HTML:
 * Wraps any wide <pre> ASCII diagrams in mobile-safe, scroll-proof responsive containers
 * and ensures font scaling so mobile email clients don't distort layouts.
 */
function enhanceHtmlWithResponsiveDiagrams(html) {
    if (!html || typeof html !== "string") {
        return html;
    }

    // Replace or wrap standalone <pre> tags with responsive containers that handle overflow gracefully on mobile
    return html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (match, attrs, codeContent) => {
        // If already wrapped in a responsive container, return as is
        if (attrs.includes("overflow-x: auto") && attrs.includes("-webkit-overflow-scrolling")) {
            return match;
        }

        const isAsciiDiagram = /┌|─|│|└|┬|┴|├|┤|┼|▼|►|▲|◄|-->|==>/i.test(codeContent);

        if (isAsciiDiagram) {
            return `
            <div style="background: #FFFDF7; border: 1px solid #E8D79A; border-left: 4px solid #D4AF37; border-radius: 6px; margin: 14px 0; overflow: hidden; box-shadow: 0 1px 3px rgba(212,175,55,0.06); max-width: 100%;">
              <div style="background: #FFF9E8; padding: 6px 12px; border-bottom: 1px solid #E8D79A; font-family: 'Consolas', monospace; font-size: 10.5px; font-weight: 700; color: #A67C00; display: flex; justify-content: space-between; align-items: center;">
                <span>📊 ARCHITECTURAL SCHEMATIC</span>
                <span style="font-size: 9.5px; color: #8A8170; font-family: -apple-system, sans-serif;">👉 Scroll horizontally on mobile if needed</span>
              </div>
              <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 12px 14px;">
                <pre style="margin: 0; font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; line-height: 1.35; color: #5a4000; white-space: pre; min-width: min-content;">${codeContent}</pre>
              </div>
            </div>`;
        }

        // Standard code block
        return `
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 12px 0; max-width: 100%;">
          <pre${attrs}>${codeContent}</pre>
        </div>`;
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = {
    renderTierNode,
    renderFlowConnector,
    renderBranchTier,
    renderResponsiveDiagram,
    convertTextFlowToResponsiveHtml,
    enhanceHtmlWithResponsiveDiagrams
};

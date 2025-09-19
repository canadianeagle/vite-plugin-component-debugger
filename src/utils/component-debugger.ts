// src/utils/component-debugger.ts
// Utility functions to work with tagged components in development

interface ComponentInfo {
  id: string;
  name: string;
  path: string;
  line: string;
  file: string;
  component: string;
  metadata?: Record<string, any>;
}

/**
 * Parse component data from a tagged element
 */
export function getComponentInfo(element: HTMLElement, prefix = 'data-dev'): ComponentInfo | null {
  const dataset = element.dataset;
  const prefixKey = prefix.replace('data-', '');
  
  const id = dataset[`${prefixKey}Id`];
  if (!id) return null;

  const metadata = dataset[`${prefixKey}Metadata`];
  let parsedMetadata: Record<string, any> | undefined;
  
  if (metadata) {
    try {
      parsedMetadata = JSON.parse(decodeURIComponent(metadata));
    } catch (e) {
      console.warn('Failed to parse metadata:', e);
    }
  }

  return {
    id,
    name: dataset[`${prefixKey}Name`] || '',
    path: dataset[`${prefixKey}Path`] || '',
    line: dataset[`${prefixKey}Line`] || '',
    file: dataset[`${prefixKey}File`] || '',
    component: dataset[`${prefixKey}Component`] || '',
    metadata: parsedMetadata
  };
}

/**
 * Find all tagged components in the DOM
 */
export function findAllComponents(prefix = 'data-dev'): ComponentInfo[] {
  const selector = `[${prefix}-id]`;
  const elements = document.querySelectorAll<HTMLElement>(selector);
  const components: ComponentInfo[] = [];

  elements.forEach(el => {
    const info = getComponentInfo(el, prefix);
    if (info) components.push(info);
  });

  return components;
}

/**
 * Find components by name
 */
export function findComponentsByName(name: string, prefix = 'data-dev'): HTMLElement[] {
  const selector = `[${prefix}-name="${name}"]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selector));
}

/**
 * Find components from a specific file
 */
export function findComponentsByFile(file: string, prefix = 'data-dev'): HTMLElement[] {
  const selector = `[${prefix}-file*="${file}"]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selector));
}

/**
 * Create a component tree visualization
 */
export function createComponentTree(rootElement?: HTMLElement): any {
  const root = rootElement || document.body;
  const tree: any = {};

  function traverse(element: Element, path: string[] = []): void {
    const info = element instanceof HTMLElement ? getComponentInfo(element) : null;
    
    if (info) {
      const key = path.join(' > ') || 'root';
      if (!tree[key]) tree[key] = [];
      tree[key].push(info);
      path = [...path, info.name];
    }

    Array.from(element.children).forEach(child => {
      traverse(child, path);
    });
  }

  traverse(root);
  return tree;
}

/**
 * Highlight component on hover (development helper)
 */
export function enableComponentHighlighting(options?: {
  prefix?: string;
  color?: string;
  showInfo?: boolean;
}) {
  const { 
    prefix = 'data-dev', 
    color = 'rgba(255, 0, 0, 0.3)',
    showInfo = true 
  } = options || {};

  let tooltip: HTMLDivElement | null = null;

  // Create tooltip element
  if (showInfo) {
    tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      pointer-events: none;
      z-index: 99999;
      max-width: 400px;
      display: none;
    `;
    document.body.appendChild(tooltip);
  }

  // Add hover listeners
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const info = getComponentInfo(target, prefix);
    
    if (info) {
      // Highlight element
      target.style.outline = `2px solid ${color}`;
      target.style.outlineOffset = '-2px';
      
      // Show tooltip
      if (tooltip && showInfo) {
        const lines = [
          `Component: ${info.name}`,
          `File: ${info.file}:${info.line}`,
          `Path: ${info.path}`
        ];
        
        if (info.metadata) {
          lines.push(`Props: ${JSON.stringify(info.metadata, null, 2)}`);
        }
        
        tooltip.innerHTML = lines.join('<br>');
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = target.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        
        // Adjust if tooltip goes off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
          tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
          tooltip.style.top = `${rect.top - tooltipRect.height - 5}px`;
        }
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset[`${prefix.replace('data-', '')}Id`]) {
      target.style.outline = '';
      target.style.outlineOffset = '';
      
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }
  });

  // Log to console
  console.log('🔍 Component highlighting enabled. Hover over elements to see their info.');
  
  return () => {
    // Cleanup function
    if (tooltip) {
      tooltip.remove();
    }
  };
}

/**
 * Log component render statistics
 */
export function logComponentStats(prefix = 'data-dev'): void {
  const components = findAllComponents(prefix);
  const stats: Record<string, number> = {};
  const fileStats: Record<string, number> = {};

  components.forEach(comp => {
    stats[comp.name] = (stats[comp.name] || 0) + 1;
    fileStats[comp.file] = (fileStats[comp.file] || 0) + 1;
  });

  console.group('📊 Component Statistics');
  console.table(stats);
  console.group('📁 File Statistics');
  console.table(fileStats);
  console.groupEnd();
  console.groupEnd();
}

/**
 * Create a performance observer for component renders
 */
export function observeComponentRenders(callback?: (info: ComponentInfo) => void) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const info = getComponentInfo(node);
            if (info) {
              console.log(`✨ Component rendered: ${info.name} at ${info.path}:${info.line}`);
              callback?.(info);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}

/**
 * Export component tree as JSON for analysis
 */
export function exportComponentData(): string {
  const components = findAllComponents();
  const tree = createComponentTree();
  
  const data = {
    timestamp: new Date().toISOString(),
    totalComponents: components.length,
    components,
    tree
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Debug helper to jump to component source (requires source maps)
 */
export function jumpToSource(element: HTMLElement): void {
  const info = getComponentInfo(element);
  if (!info) {
    console.warn('No component info found for element:', element);
    return;
  }

  // This creates a clickable link in Chrome DevTools
  console.log(`📍 Component source: ${info.path}:${info.line}:0`);
  
  // Alternative: Copy path to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`${info.path}:${info.line}`);
    console.log('✅ Path copied to clipboard');
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  // Add global debug helpers
  (window as any).__componentDebugger = {
    getComponentInfo,
    findAllComponents,
    findComponentsByName,
    findComponentsByFile,
    createComponentTree,
    enableComponentHighlighting,
    logComponentStats,
    observeComponentRenders,
    exportComponentData,
    jumpToSource
  };

  console.log('🚀 Component Debugger initialized. Access via window.__componentDebugger');
  console.log('Try: __componentDebugger.enableComponentHighlighting()');
}

export default {
  getComponentInfo,
  findAllComponents,
  findComponentsByName,
  findComponentsByFile,
  createComponentTree,
  enableComponentHighlighting,
  logComponentStats,
  observeComponentRenders,
  exportComponentData,
  jumpToSource
};
/**
 * Regression: Safe navigation chaining.
 *
 * Issue: a?.b?.c?.d expressions must correctly generate
 * the nested null checks.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'safe-nav-simple',
    category: 'regressions',
    description: 'Simple safe navigation',
    className: 'SafeNavSimpleComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-simple',
  standalone: true,
  template: \`
      <div>{{ user?.name }}</div>
      <div>{{ user?.profile?.bio }}</div>
    \`,
})
export class SafeNavSimpleComponent {
  user: { name: string; profile?: { bio: string } } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-deep-chain',
    category: 'regressions',
    description: 'Deep safe navigation chain',
    className: 'SafeNavDeepChainComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-deep-chain',
  standalone: true,
  template: \`
      <div>{{ a?.b?.c?.d?.e?.f }}</div>
    \`,
})
export class SafeNavDeepChainComponent {
  a: { b?: { c?: { d?: { e?: { f?: string } } } } } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-method-call',
    category: 'regressions',
    description: 'Safe navigation with method call',
    className: 'SafeNavMethodCallComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-method-call',
  standalone: true,
  template: \`
      <div>{{ user?.getName?.() }}</div>
      <div>{{ service?.data?.transform?.('arg') }}</div>
    \`,
})
export class SafeNavMethodCallComponent {
  user: { getName?: () => string } | null = null;
  service: { data?: { transform?: (arg: string) => string } } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
  {
    name: 'safe-nav-in-binding',
    category: 'regressions',
    description: 'Safe navigation in property binding',
    className: 'SafeNavInBindingComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-in-binding',
  standalone: true,
  template: \`
      <div [title]="item?.tooltip?.text"
           [class.active]="item?.state?.isActive"
           [style.color]="item?.style?.color">
        Content
      </div>
    \`,
})
export class SafeNavInBindingComponent {
  item: { tooltip?: { text: string }; state?: { isActive: boolean }; style?: { color: string } } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵproperty', 'ɵɵclassProp', 'ɵɵstyleProp'],
  },
  {
    name: 'safe-nav-combined',
    category: 'regressions',
    description: 'Safe navigation combined with other operators',
    className: 'SafeNavCombinedComponent',
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-safe-nav-combined',
  standalone: true,
  template: \`
      <div>{{ (user?.age ?? 0) > 18 ? 'Adult' : 'Minor' }}</div>
      <div>{{ user?.roles?.includes('admin') ? 'Admin' : 'User' }}</div>
    \`,
})
export class SafeNavCombinedComponent {
  user: { age?: number; roles?: string[] } | null = null;
}
    `.trim(),
    expectedFeatures: ['ɵɵtextInterpolate1'],
  },
]

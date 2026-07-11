import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// jest.mock calls are hoisted above these imports by babel, so the mocks below
// still apply to TabLayout despite the import ordering.
import TabLayout from '../(tabs)/_layout';

// The safe-area inset drives the bar height; no provider is mounted in the unit
// environment, so return a fixed inset.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));

// Render expo-router's <Tabs> as a plain container that invokes each screen's
// custom tabBarButton, so the tab bar's own button tree (icon + label) is
// exercised without spinning up a full navigator.
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  function Tabs({ children }: { children: ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  }
  Tabs.Screen = function Screen({
    options,
  }: {
    options?: { tabBarButton?: (props: Record<string, unknown>) => ReactNode };
  }) {
    const Button = options?.tabBarButton;
    if (!Button) return null;
    return React.createElement(Button, { 'aria-selected': false, onPress: jest.fn() });
  };
  return { Tabs, useRouter: () => ({ push: jest.fn(), back: jest.fn() }) };
});

describe('TabLayout bottom navigation', () => {
  it('renders every regular tab label so none is clipped away', async () => {
    await render(<TabLayout />);

    for (const label of ['Heute', 'Plan', 'Progress', 'Me']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('keeps the center create button in its own slot', async () => {
    await render(<TabLayout />);

    expect(screen.getByTestId('create-fab')).toBeTruthy();
  });

  it('exposes each regular tab as a selectable button', async () => {
    await render(<TabLayout />);

    // Only the four regular tabs carry a selected accessibility state; the
    // center create button does not.
    const selectable = screen
      .getAllByRole('button')
      .filter((node) => node.props.accessibilityState?.selected !== undefined);
    expect(selectable).toHaveLength(4);
    expect(selectable.every((node) => node.props.accessibilityState.selected === false)).toBe(true);
  });
});

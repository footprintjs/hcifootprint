// The app's own store of currently-visible controls — unchanged by the
// integration. Its field names are deliberately NOT the library's: the adapter
// in agent-map.ts is what a real app has to write.
export const legacyStore = {
  on: (_event: 'change', _fn: () => void) => () => {},
  visibleControls: () => [
    { pageId: 'billing', id: 'choose-plan', label: 'Choose a plan', perform: () => {}, disabled: false },
  ],
};

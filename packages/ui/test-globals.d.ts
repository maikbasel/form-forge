/// <reference types="@testing-library/jest-dom/vitest" />

// Workaround: @testing-library/user-event's index.d.ts re-exports from
// './setup' (extensionless relative path) which NodeNext moduleResolution
// cannot resolve. This causes the default export to lose its type.
// Re-declare the module with the subset of the API used in our tests.
declare module "@testing-library/user-event" {
  interface UserEventInstance {
    clear(element: Element): Promise<void>;
    click(element: Element): Promise<void>;
    dblClick(element: Element): Promise<void>;
    hover(element: Element): Promise<void>;
    keyboard(text: string): Promise<void>;
    selectOptions(
      element: Element,
      values: string | string[] | HTMLElement | HTMLElement[]
    ): Promise<void>;
    setup(options?: Record<string, unknown>): UserEventInstance;
    tab(options?: { shift?: boolean }): Promise<void>;
    type(element: Element, text: string): Promise<void>;
    unhover(element: Element): Promise<void>;
    upload(element: HTMLElement, fileOrFiles: File | File[]): Promise<void>;
  }

  const userEvent: UserEventInstance;
  export default userEvent;
  export { userEvent };
}

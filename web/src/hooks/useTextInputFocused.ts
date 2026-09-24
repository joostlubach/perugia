import { useEffect, useState } from 'react';

// True while a text-entry element has focus, i.e. while the on-screen keyboard is likely shown.
export function useTextInputFocused() {
  const [focused, setFocused] = useState(() => isTextInput(document.activeElement));

  useEffect(() => {
    const update = () => setFocused(isTextInput(document.activeElement));
    const onFocusOut = () => setTimeout(update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return focused;
}

const NON_TEXT_INPUT_TYPES = ['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color', 'image', 'hidden'];

function isTextInput(el: Element | null) {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.includes(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

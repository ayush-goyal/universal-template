import { forwardRef } from "react";
import { TextInput } from "react-native";

const MockCodeField = forwardRef<any, any>((props, ref) => (
  <TextInput
    ref={ref}
    accessibilityLabel={props.accessibilityLabel}
    testID={props.testID}
    value={props.value}
    onChangeText={props.onChangeText}
  />
));
MockCodeField.displayName = "MockCodeField";

export const CodeField = MockCodeField;
export const Cursor = () => null;
export const useBlurOnFulfill = () => null;
export const useClearByFocusCell = () => [{}, () => jest.fn()];

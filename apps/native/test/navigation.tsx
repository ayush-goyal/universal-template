import type { ComponentType } from "react";
import { View } from "react-native";
import {
  createNavigatorFactory,
  NavigationContainer,
  StackRouter,
  useNavigationBuilder,
} from "@react-navigation/native";

import { renderWithProviders } from "./render";

function TestStackNavigator(props: any) {
  const { state, descriptors, render } = useNavigationBuilder(StackRouter, props);

  return render(
    <>
      {state.routes.map((route, index) => (
        <View key={route.key} aria-hidden={index !== state.index}>
          {descriptors[route.key]?.render()}
        </View>
      ))}
    </>
  );
}

const createTestStackNavigator = createNavigatorFactory(TestStackNavigator);

type TestScreen = {
  component: ComponentType<any>;
  name: string;
};

export async function renderInTestStack(initialRouteName: string, screens: TestScreen[]) {
  const Stack = createTestStackNavigator();

  return renderWithProviders(
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName}>
        {screens.map(({ component, name }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

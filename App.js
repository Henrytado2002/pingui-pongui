import 'react-native-gesture-handler';
import React from 'react';
import { Text, StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from './src/theme';
import PlayScreen from './src/screens/PlayScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import PlayersScreen from './src/screens/PlayersScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.accent,
    text: colors.textPrimary,
  },
};

const ICONS = { Play: '🏓', Matches: '📋', Players: '👥' };

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Play" component={PlayScreen} />
        <Tab.Screen name="Matches" component={MatchesScreen} />
        <Tab.Screen name="Players" component={PlayersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

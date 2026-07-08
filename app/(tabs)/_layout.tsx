import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: C.green,
      tabBarInactiveTintColor: C.textMuted,
      tabBarStyle: { 
        backgroundColor: C.surface, 
        borderTopColor: C.border, 
        borderTopWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerStyle: { backgroundColor: C.bg },
      headerTintColor: C.green,
      headerTitleStyle: { 
        fontFamily: 'Inter_700Bold', 
        color: C.text,
      },
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'الرئيسية', 
          tabBarIcon: ({color}) => <Feather name="home" size={22} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="tools" 
        options={{ 
          title: 'الأدوات', 
          tabBarIcon: ({color}) => <Feather name="tool" size={22} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="techniques" 
        options={{ 
          title: 'التقنيات', 
          tabBarIcon: ({color}) => <Feather name="book-open" size={22} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="reference" 
        options={{ 
          title: 'المرجع', 
          tabBarIcon: ({color}) => <Feather name="terminal" size={22} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="ai" 
        options={{ 
          title: 'الذكاء الاصطناعي', 
          tabBarIcon: ({color}) => <Feather name="cpu" size={22} color={color} /> 
        }} 
      />
    </Tabs>
  );
}

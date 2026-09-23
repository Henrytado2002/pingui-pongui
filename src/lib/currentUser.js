import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ppt_current_user_id';

export async function getCurrentUserId() {
  return AsyncStorage.getItem(KEY);
}

export async function setCurrentUserId(id) {
  if (id) await AsyncStorage.setItem(KEY, id);
  else await AsyncStorage.removeItem(KEY);
}

import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { landingStyles, playStyles } from '../screens/styles';

export default function CreatePlayerModal({
  visible,
  title,
  items = [],
  selectedId,
  onSelectItem,
  onClose,
  onCreatePlayer,
  emptyText,
  variant = 'landing',
}) {
  const styles = variant === 'landing' ? landingStyles : playStyles;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowCreateForm(false);
      setFirstName('');
      setLastName('');
      setSaving(false);
    }
  }, [visible]);

  function resetForm() {
    setFirstName('');
    setLastName('');
    setShowCreateForm(false);
  }

  async function handleSavePlayer() {
    const sanitizedFirst = firstName.trim();
    const sanitizedLast = lastName.trim();

    if (!sanitizedFirst || !sanitizedLast) {
      Alert.alert('Add both names', 'Please enter a first name and a last name for the new player.');
      return;
    }

    setSaving(true);
    try {
      await onCreatePlayer(sanitizedFirst, sanitizedLast);
      resetForm();
    } catch (error) {
      Alert.alert('Could not add player', error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, showCreateForm && styles.modalSheetCompact]}>
          {!showCreateForm ? (
            <>
              <Text style={styles.modalTitle}>{title}</Text>
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.optionRow, selectedId != null && String(item.id) === String(selectedId) && styles.optionRowSelected]}
                    onPress={() => {
                      onSelectItem(item);
                    }}
                  >
                    <Text style={styles.optionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
              />
            </>
          ) : (
            <View style={styles.createPlayerCard}>
              <Text style={styles.modalTitle}>Create new player</Text>
              <TextInput
                style={styles.createOpponentInput}
                placeholder="First name"
                placeholderTextColor="#ffffff"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                onSubmitEditing={handleSavePlayer}
                returnKeyType="next"
              />
              <TextInput
                style={styles.createOpponentInput}
                placeholder="Last name"
                placeholderTextColor="#ffffff"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                onSubmitEditing={handleSavePlayer}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.createOpponentButton, saving && styles.createOpponentButtonDisabled]}
                onPress={handleSavePlayer}
                disabled={saving}
              >
                <Text style={styles.createOpponentButtonText}>{saving ? 'Saving…' : 'Save player'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!showCreateForm ? (
            <TouchableOpacity
              style={styles.modalCreateButton}
              onPress={() => setShowCreateForm(true)}
            >
              <Text style={styles.modalCreateButtonText}>Create new player</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.modalClose} onPress={handleClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

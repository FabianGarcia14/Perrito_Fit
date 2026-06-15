import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useStore } from '../store/useStore';
import { updateGoals, logoutUser, changeUserPassword } from '../services/authService';
import { Colors } from '../theme/colors';

export default function SettingsScreen() {
  const { user, setUser } = useStore();

  const [calories, setCalories] = useState(String(user?.goals.calories ?? 2000));
  const [protein, setProtein] = useState(String(user?.goals.protein ?? 150));
  const [carbs, setCarbs] = useState(String(user?.goals.carbs ?? 250));
  const [fat, setFat] = useState(String(user?.goals.fat ?? 65));
  const [water, setWater] = useState(String(user?.goals.water ?? 8));
  const [sodium, setSodium] = useState(String(user?.goals.sodium ?? 2300));
  const [cholesterol, setCholesterol] = useState(String(user?.goals.cholesterol ?? 300));
  const [sugars, setSugars] = useState(String(user?.goals.sugars ?? 50));
  const [fiber, setFiber] = useState(String(user?.goals.fiber ?? 28));
  const [weightGoal, setWeightGoal] = useState(String(user?.goals.weight ?? 150));
  const [fastingHours, setFastingHours] = useState(String(user?.goals.fastingHours ?? 14));
  const [fastingStartTime, setFastingStartTime] = useState(user?.goals.fastingStartTime ?? '20:00');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Platform.OS === 'web' ? window.alert('Please enter both current and new passwords.') : Alert.alert('Error', 'Please enter both current and new passwords.');
      return;
    }
    if (newPassword.length < 8) {
      Platform.OS === 'web' ? window.alert('Password must be at least 8 characters long.') : Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }
    setChangingPassword(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      Platform.OS === 'web' ? window.alert('Your password has been changed successfully.') : Alert.alert('Success', 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      let msg = e.message || 'Failed to change password.';
      if (msg.includes('auth/invalid-credential')) {
        msg = 'Incorrect current password.';
      }
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setChangingPassword(false);
      setShowPasswordModal(false);
    }
  };

  const handleSaveGoals = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const newGoals = {
        calories: parseInt(calories) || 2000,
        protein: parseInt(protein) || 150,
        carbs: parseInt(carbs) || 250,
        fat: parseInt(fat) || 65,
        water: parseInt(water) || 8,
        sodium: parseInt(sodium) || 2300,
        cholesterol: parseInt(cholesterol) || 300,
        sugars: parseInt(sugars) || 50,
        fiber: parseInt(fiber) || 28,
        weight: parseFloat(weightGoal) || 150,
        fastingHours: parseInt(fastingHours) || 14,
        fastingStartTime: fastingStartTime || '20:00',
      };
      await updateGoals(user.uid, newGoals);
      setUser({ ...user, goals: newGoals });
      Platform.OS === 'web' ? window.alert('Your goals have been updated.') : Alert.alert('✅ Saved!', 'Your goals have been updated.');
    } catch (e) {
      Platform.OS === 'web' ? window.alert('Could not save goals. Try again.') : Alert.alert('Error', 'Could not save goals. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        logoutUser();
      }
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings ⚙️</Text>

      {/* User Info */}
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName ?? 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>
      </View>


      {/* Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Goals</Text>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🔥 Calories (kcal)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🥩 Protein (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🍞 Carbs (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🥑 Fat (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={fat}
            onChangeText={setFat}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>💧 Water (oz)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={water}
            onChangeText={setWater}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🧂 Sodium (mg)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={sodium}
            onChangeText={setSodium}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🍳 Cholesterol (mg)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={cholesterol}
            onChangeText={setCholesterol}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🍬 Sugars (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={sugars}
            onChangeText={setSugars}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🌾 Fiber (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={fiber}
            onChangeText={setFiber}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>⚖️ Target Weight (lbs)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={weightGoal}
            onChangeText={setWeightGoal}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>⏳ Fasting Goal (hrs)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={fastingHours}
            onChangeText={setFastingHours}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>⏰ Fasting Start Time</Text>
          <TextInput
            style={styles.goalInput}
            value={fastingStartTime}
            onChangeText={setFastingStartTime}
            placeholder="20:00"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoals} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Goals</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password Link */}
      <TouchableOpacity style={styles.linkCard} onPress={() => setShowPasswordModal(true)}>
        <Text style={styles.linkText}>🔒 Change Password</Text>
      </TouchableOpacity>

      <Modal visible={showPasswordModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginTop: 0 }]} onPress={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>🐕 Perrito Fit</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appMascots}>Mali 🐕‍🦺 & Henni 🐕</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 20 },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },

  // User Info
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  userInfo: { marginLeft: 16 },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Goals
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1 },
  goalInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    width: 100,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  textInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    flex: 2,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },

  // Save
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Sign Out
  signOutBtn: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: { color: Colors.error, fontSize: 16, fontWeight: '700' },

  // App Info
  appInfo: { alignItems: 'center', paddingVertical: 20 },
  appName: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  appVersion: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  appMascots: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  // Link Card
  linkCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surface,
    alignItems: 'center',
  },
  linkText: { color: Colors.text, fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },
});

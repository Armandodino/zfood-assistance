import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Spacing, BorderRadius, ZFoodColors } from '@/constants/theme';
import { getApiUrl } from '@/utils/api';

interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: any;
  createdAt: string;
}

interface AdminSummary {
  adminId: string;
  name: string;
  count: number;
  lastAction: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  login: { label: 'Connexion', icon: 'log-in', color: ZFoodColors.primary600 },
  logout: { label: 'Déconnexion', icon: 'log-out', color: ZFoodColors.gray400 },
  create_client: { label: 'Nouveau client', icon: 'user-plus', color: ZFoodColors.success },
  update_client: { label: 'Modif. client', icon: 'edit', color: ZFoodColors.accent },
  delete_client: { label: 'Suppr. client', icon: 'user-x', color: ZFoodColors.error },
  create_order: { label: 'Nouvelle commande', icon: 'plus-circle', color: ZFoodColors.success },
  update_order: { label: 'Modif. commande', icon: 'edit-2', color: ZFoodColors.accent },
  delete_order: { label: 'Suppr. commande', icon: 'trash-2', color: ZFoodColors.error },
  update_payment: { label: 'Paiement', icon: 'credit-card', color: ZFoodColors.success },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function SudoDashboardScreen() {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [recentLogins, setRecentLogins] = useState<ActivityLog[]>([]);
  const [adminSummaries, setAdminSummaries] = useState<AdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'logins' | 'clients' | 'orders'>('all');

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/activity-logs/summary`, {
        headers: {
          'x-admin-password': 'ZFOOD',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRecentLogins(data.recentLogins || []);
        setLogs(data.recentActions || []);
        setAdminSummaries(data.actionsByAdmin || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.selectionAsync();
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'logins') return log.actionType === 'login' || log.actionType === 'logout';
    if (selectedFilter === 'clients') return log.entityType === 'client';
    if (selectedFilter === 'orders') return log.entityType === 'order';
    return true;
  });

  if (!currentUser?.isSudo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.accessDenied}>
          <Feather name="lock" size={48} color={ZFoodColors.error} />
          <ThemedText type="h2" style={{ marginTop: Spacing.md, color: theme.text }}>
            Accès refusé
          </ThemedText>
          <ThemedText style={{ color: theme.textMuted, marginTop: Spacing.sm, textAlign: 'center' }}>
            Cette section est réservée aux super administrateurs.
          </ThemedText>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={ZFoodColors.primary600} />
        <ThemedText style={{ color: theme.textMuted, marginTop: Spacing.md }}>
          Chargement des activités...
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ZFoodColors.primary600} />
      }
    >
      <View style={styles.header}>
        <ThemedText type="h2" style={{ color: theme.text }}>
          Journal d'activités
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textMuted, marginTop: Spacing.xs }}>
          Suivi des actions des administrateurs
        </ThemedText>
      </View>

      <Card style={styles.summaryCard}>
        <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.md }}>
          Activité des admins
        </ThemedText>
        {adminSummaries.map(admin => (
          <View key={admin.adminId} style={[styles.adminRow, { borderBottomColor: theme.border }]}>
            <View style={styles.adminInfo}>
              <View style={[styles.adminAvatar, { backgroundColor: ZFoodColors.primary600 + '20' }]}>
                <ThemedText style={{ color: ZFoodColors.primary600, fontWeight: '600' }}>
                  {admin.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={{ color: theme.text, fontWeight: '500' }}>{admin.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {admin.count} actions - Dernière: {formatDate(admin.lastAction)}
                </ThemedText>
              </View>
            </View>
          </View>
        ))}
        {adminSummaries.length === 0 && (
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', padding: Spacing.md }}>
            Aucune activité enregistrée
          </ThemedText>
        )}
      </Card>

      <Card style={styles.loginsCard}>
        <View style={styles.cardHeader}>
          <Feather name="log-in" size={18} color={ZFoodColors.primary600} />
          <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
            Connexions récentes
          </ThemedText>
        </View>
        {recentLogins.slice(0, 5).map(login => (
          <View key={login.id} style={[styles.loginRow, { borderBottomColor: theme.border }]}>
            <View style={styles.loginInfo}>
              <ThemedText style={{ color: theme.text, fontWeight: '500' }}>{login.adminName}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>{login.adminEmail}</ThemedText>
            </View>
            <View style={styles.loginTime}>
              <ThemedText style={{ color: ZFoodColors.primary600, fontWeight: '500' }}>
                {formatTime(login.createdAt)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {formatDate(login.createdAt)}
              </ThemedText>
            </View>
          </View>
        ))}
        {recentLogins.length === 0 && (
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', padding: Spacing.md }}>
            Aucune connexion récente
          </ThemedText>
        )}
      </Card>

      <View style={styles.filterSection}>
        <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.sm }}>
          Historique complet
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {[
            { key: 'all', label: 'Tout' },
            { key: 'logins', label: 'Connexions' },
            { key: 'clients', label: 'Clients' },
            { key: 'orders', label: 'Commandes' },
          ].map(filter => (
            <Pressable
              key={filter.key}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedFilter(filter.key as any);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedFilter === filter.key ? ZFoodColors.primary600 : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                style={{
                  color: selectedFilter === filter.key ? '#fff' : theme.text,
                  fontWeight: selectedFilter === filter.key ? '600' : '400',
                }}
              >
                {filter.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.logsList}>
        {filteredLogs.map(log => {
          const actionInfo = ACTION_LABELS[log.actionType] || {
            label: log.actionType,
            icon: 'activity',
            color: theme.textMuted,
          };
          return (
            <View key={log.id} style={[styles.logItem, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.logIcon, { backgroundColor: actionInfo.color + '15' }]}>
                <Feather name={actionInfo.icon} size={16} color={actionInfo.color} />
              </View>
              <View style={styles.logContent}>
                <View style={styles.logHeader}>
                  <ThemedText style={{ color: theme.text, fontWeight: '500' }}>
                    {log.adminName}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {formatTime(log.createdAt)} - {formatDate(log.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: actionInfo.color, marginTop: 2 }}>
                  {actionInfo.label}
                  {log.entityName && (
                    <ThemedText style={{ color: theme.textMuted }}>
                      {' '}• {log.entityName}
                    </ThemedText>
                  )}
                </ThemedText>
              </View>
            </View>
          );
        })}
        {filteredLogs.length === 0 && (
          <Card style={styles.emptyState}>
            <Feather name="inbox" size={32} color={theme.textMuted} />
            <ThemedText style={{ color: theme.textMuted, marginTop: Spacing.sm }}>
              Aucune activité trouvée
            </ThemedText>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  header: {
    marginBottom: Spacing.lg,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  summaryCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  adminRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  loginsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loginInfo: {},
  loginTime: {
    alignItems: 'flex-end',
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterScroll: {
    marginTop: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  logsList: {
    gap: Spacing.sm,
  },
  logItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
});

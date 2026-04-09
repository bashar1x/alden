import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
  Share,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const STORAGE_KEY = '@debt_manager_data';
const EXCHANGE_RATE_KEY = '@exchange_rate';

export default function App() {
  const [debtors, setDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [addDebtorModal, setAddDebtorModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDebtItem, setNewDebtItem] = useState({
    itemName: '',
    priceSYP: '',
    quantity: '1',
  });
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Currency states
  const [isUSD, setIsUSD] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(15000);
  const [exchangeModalVisible, setExchangeModalVisible] = useState(false);
  const [tempExchangeRate, setTempExchangeRate] = useState('');

  useEffect(() => {
    loadData();
    loadExchangeRate();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDebtors(debtors);
    } else {
      const query = searchQuery.trim().toLowerCase();
      const filtered = debtors.filter(debtor =>
        debtor.name.toLowerCase().includes(query)
      );
      setFilteredDebtors(filtered);
    }
  }, [searchQuery, debtors]);

  useEffect(() => {
    saveData();
  }, [debtors]);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        setDebtors(parsedData.debtors || []);
        setFilteredDebtors(parsedData.debtors || []);
      }
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const saveData = async () => {
    try {
      const data = {
        debtors,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data', error);
    }
  };

  const loadExchangeRate = async () => {
    try {
      const rate = await AsyncStorage.getItem(EXCHANGE_RATE_KEY);
      if (rate) {
        setExchangeRate(parseFloat(rate));
      }
    } catch (error) {
      console.error('Failed to load exchange rate', error);
    }
  };

  const saveExchangeRate = async (rate) => {
    try {
      await AsyncStorage.setItem(EXCHANGE_RATE_KEY, rate.toString());
    } catch (error) {
      console.error('Failed to save exchange rate', error);
    }
  };

  const handleCurrencySwitch = (value) => {
    Alert.alert('تبديل العملة', 'هل أنت متأكد من رغبتك في تبديل العملة؟\nسوف يتم إعادة حساب جميع الأموال', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تأكيد', onPress: () => {
        if (value && !isUSD) {
          // Switching to USD, show exchange rate modal
          setTempExchangeRate(exchangeRate.toString());
          setExchangeModalVisible(true);
        } else if (!value && isUSD) {
          // Switching back to SYP, just change
          setIsUSD(false);
        } else if (value && isUSD) {
          // Already USD, do nothing
          setIsUSD(false);
        }
      }}
    ]);
  };

  const confirmExchangeRate = () => {
    const rate = parseFloat(tempExchangeRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('خطأ', 'الرجاء إدخال سعر صرف صحيح');
      return;
    }
    setExchangeRate(rate);
    saveExchangeRate(rate);
    setIsUSD(true);
    setExchangeModalVisible(false);
    Alert.alert('نجاح', `تم تعيين سعر الصرف: 1 دولار = ${rate.toLocaleString()} ل.س`);
  };

  const convertToUSD = (amountSYP) => {
    if (!amountSYP || amountSYP === 0) return 0;
    return amountSYP / exchangeRate;
  };

  const convertToSYP = (amountUSD) => {
    if (!amountUSD || amountUSD === 0) return 0;
    return amountUSD * exchangeRate;
  };

  const formatCurrency = (amountSYP, showCurrency = true) => {
    if (isUSD) {
      const amountUSD = convertToUSD(amountSYP);
      if (showCurrency) {
        return `$${amountUSD.toFixed(2)}`;
      }
      return amountUSD.toFixed(2);
    }
    if (showCurrency) {
      return `${Math.round(amountSYP).toLocaleString()} ل.س`;
    }
    return Math.round(amountSYP).toLocaleString();
  };

  const formatPriceInput = (priceSYP) => {
    if (isUSD) {
      const priceUSD = convertToUSD(parseFloat(priceSYP) || 0);
      return priceUSD.toFixed(2);
    }
    return priceSYP;
  };

  const parsePriceFromInput = (value) => {
    if (isUSD) {
      const usdAmount = parseFloat(value) || 0;
      return convertToSYP(usdAmount);
    }
    return parseFloat(value) || 0;
  };

  const addDebtor = () => {
    if (!newDebtorName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم المدين');
      return;
    }
    const newDebtor = {
      id: Date.now().toString(),
      name: newDebtorName.trim(),
      debts: [],
      totalDebtSYP: 0,
      createdAt: new Date().toISOString(),
    };
    const updatedDebtors = [...debtors, newDebtor];
    setDebtors(updatedDebtors.reverse());
    setNewDebtorName('');
    setAddDebtorModal(false);
  };

  const addDebt = () => {
    if (!newDebtItem.itemName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم المادة');
      return;
    }
    const quantity = parseInt(newDebtItem.quantity) || 1;
    const priceSYP = parsePriceFromInput(newDebtItem.priceSYP);

    if (priceSYP === 0) {
      Alert.alert('خطأ', `الرجاء إدخال السعر ${isUSD ? 'بالدولار' : 'بالليرة السورية'}`);
      return;
    }

    const totalSYP = priceSYP * quantity;

    const newDebt = {
      id: Date.now().toString(),
      itemName: newDebtItem.itemName,
      priceSYP,
      quantity,
      totalSYP,
      date: new Date().toLocaleDateString('ar-SY'),
      time: new Date().toLocaleTimeString('ar-SY'),
      type: 'debt',
    };

    const updatedDebtors = debtors.map(debtor => {
      if (debtor.id === selectedDebtor.id) {
        const updatedDebts = [...debtor.debts, newDebt];

        let totalDebtSYP = 0;
        updatedDebts.forEach(item => {
          if (item.type === 'debt') {
            totalDebtSYP += item.totalSYP;
          } else if (item.type === 'payment') {
            totalDebtSYP -= item.amountSYP;
          }
        });

        if (totalDebtSYP < 0) totalDebtSYP = 0;

        return {
          ...debtor,
          debts: updatedDebts,
          totalDebtSYP,
        };
      }
      return debtor;
    });

    setDebtors(updatedDebtors);
    setNewDebtItem({ itemName: '', priceSYP: '', quantity: '1' });
    setModalVisible(false);
    setSelectedDebtor(null);
  };

  const makePayment = () => {
    const amountSYP = parsePriceFromInput(paymentAmount);

    if (isNaN(amountSYP) || amountSYP <= 0) {
      Alert.alert('خطأ', `الرجاء إدخال مبلغ صحيح ${isUSD ? 'بالدولار' : 'بالليرة السورية'}`);
      return;
    }

    if (amountSYP > selectedDebtor.totalDebtSYP) {
      Alert.alert(
        'خطأ في الدفع',
        `المبلغ المدخل (${formatCurrency(amountSYP)}) يتجاوز المبلغ المستحق (${formatCurrency(selectedDebtor.totalDebtSYP)})\n\nالرجاء إدخال مبلغ أقل أو يساوي المبلغ المستحق.`
      );
      return;
    }

    const updatedDebtors = debtors.map(debtor => {
      if (debtor.id === selectedDebtor.id) {
        let newTotalSYP = debtor.totalDebtSYP - amountSYP;
        if (newTotalSYP < 0) newTotalSYP = 0;

        const paymentRecord = {
          id: Date.now().toString(),
          amountSYP: amountSYP,
          date: new Date().toLocaleDateString('ar-SY'),
          time: new Date().toLocaleTimeString('ar-SY'),
          type: 'payment',
        };

        const updatedDebts = [...debtor.debts, paymentRecord];

        return {
          ...debtor,
          debts: updatedDebts,
          totalDebtSYP: newTotalSYP,
        };
      }
      return debtor;
    });

    setDebtors(updatedDebtors);
    setPaymentAmount('');
    setPaymentModal(false);
    setSelectedDebtor(null);
    Alert.alert('نجاح', 'تم تسجيل الدفعة بنجاح');
  };

  const deleteTransaction = (debtor, transaction) => {
    let message = '';
    if (transaction.type === 'debt') {
      message = `هل أنت متأكد من حذف عملية إضافة دين "${transaction.itemName}" بقيمة ${formatCurrency(transaction.totalSYP)}؟`;
    } else {
      message = `هل أنت متأكد من حذف عملية الدفع بقيمة ${formatCurrency(transaction.amountSYP)}؟`;
    }

    Alert.alert(
      'تأكيد الحذف',
      message,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            const updatedDebts = debtor.debts.filter(t => t.id !== transaction.id);

            let totalDebtSYP = 0;
            updatedDebts.forEach(item => {
              if (item.type === 'debt') {
                totalDebtSYP += item.totalSYP;
              } else if (item.type === 'payment') {
                totalDebtSYP -= item.amountSYP;
              }
            });

            if (totalDebtSYP < 0) totalDebtSYP = 0;

            const updatedDebtors = debtors.map(d => {
              if (d.id === debtor.id) {
                return {
                  ...d,
                  debts: updatedDebts,
                  totalDebtSYP: totalDebtSYP,
                };
              }
              return d;
            });

            setDebtors(updatedDebtors);
            Alert.alert('نجاح', 'تم حذف المعاملة بنجاح');
          },
        },
      ]
    );
  };

  const deleteDebtor = (debtor) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف ${debtor.name}؟\nسيتم حذف جميع ديونه بشكل نهائي.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            setDebtors(debtors.filter(d => d.id !== debtor.id));
          },
        },
      ]
    );
  };

  const shareDebtorDetails = (debtor) => {
    let transactionsText = '';
    let totalPaid = 0;

    debtor.debts.forEach(item => {
      if (item.type === 'debt') {
        transactionsText += `\n📦 *${item.itemName}* (قطعة ${item.quantity})\n💰 ${formatCurrency(item.totalSYP)}\n📅 ${item.date} ${item.time}\n`;
      } else if (item.type === 'payment') {
        totalPaid += item.amountSYP;
        transactionsText += `\n✅ *دفعة:* ${formatCurrency(item.amountSYP)}\n📅 ${item.date} - ${item.time}\n`;
      }
    });

    const shareText = `
 *تقرير المدين*

👤 *الاسم:* ${debtor.name}
📅 *تاريخ الإنشاء:* ${new Date(debtor.createdAt).toLocaleDateString('ar-SY')}


💰 *الملخص المالي:*
• *إجمالي المشتريات:* ${formatCurrency(debtor.totalDebtSYP + totalPaid)}
• *إجمالي المدفوعات:* ${formatCurrency(totalPaid)}
• *المبلغ المتبقي:* ${formatCurrency(debtor.totalDebtSYP)}


📋 *سجل المعاملات:*
${transactionsText || 'لا توجد معاملات مسجلة'}


تم إنشاء هذا التقرير بواسطة *تطبيق مدير الديون*
  `;

    Share.share({
      message: shareText,
      title: `تقرير ديون - ${debtor.name}`,
    }, {
      dialogTitle: `مشاركة تقرير ${debtor.name}`,
    });
  };

  const exportData = async () => {
    try {
      const dataToExport = {
        debtors,
        exportDate: new Date().toISOString(),
        version: '2.0',
        currencySettings: {
          exchangeRate: exchangeRate,
          isUSD: isUSD,
        },
      };
      const jsonString = JSON.stringify(dataToExport, null, 2);

      await Share.share({
        message: jsonString,
        title: 'تصدير بيانات الديون',
      }, {
        dialogTitle: 'مشاركة بيانات الديون',
      });
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تصدير البيانات');
      console.error(error);
    }
  };

  const importData = () => {
    if (!importJsonText.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال بيانات JSON');
      return;
    }

    try {
      const parsedData = JSON.parse(importJsonText);

      if (!parsedData.debtors || !Array.isArray(parsedData.debtors)) {
        throw new Error('بيانات غير صالحة: يجب أن تحتوي على قائمة المدينين');
      }

      Alert.alert(
        'تأكيد الاستيراد',
        `سيتم استيراد ${parsedData.debtors.length} مدين. سيتم استبدال البيانات الحالية. هل تريد المتابعة؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استيراد',
            onPress: () => {
              setDebtors(parsedData.debtors);
              if (parsedData.currencySettings) {
                setExchangeRate(parsedData.currencySettings.exchangeRate);
                saveExchangeRate(parsedData.currencySettings.exchangeRate);
                setIsUSD(parsedData.currencySettings.isUSD);
              }
              setImportJsonText('');
              setImportModalVisible(false);
              Alert.alert('نجاح', 'تم استيراد البيانات بنجاح');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('خطأ', `فشل في استيراد البيانات: ${error.message}`);
      console.error(error);
    }
  };

  const getTotalStats = () => {
    const totalDebtSYP = debtors.reduce((sum, d) => sum + d.totalDebtSYP, 0);
    return {
      totalDebtFormatted: formatCurrency(totalDebtSYP),
      totalDebtors: debtors.length,
    };
  };

  const stats = getTotalStats();

  const renderDebtItem = (item, debtor) => {
    if (item.type === 'payment') {
      return (
        <View key={item.id} style={styles.paymentItem}>
          <View style={styles.paymentIconContainer}>
            <MaterialIcons name="payment" size={20} color="#2cb364" />
          </View>
          <View style={styles.paymentContent}>
            <Text style={styles.paymentText}>
              {formatCurrency(item.amountSYP)}
            </Text>
            <Text style={styles.itemDateText}>{item.date} {item.time}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteTransactionButton}
            onPress={() => deleteTransaction(debtor, item)}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View key={item.id} style={styles.debtItemCard}>
        <View style={styles.debtItemHeader}>
          <View style={styles.itemNameContainer}>
            <Ionicons name="cart" size={18} color="#639ec5" />
            <Text style={styles.itemNameText}>{item.itemName}</Text>
          </View>
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>×{item.quantity}</Text>
          </View>
        </View>
        <View style={styles.debtItemDetails}>
          <View style={styles.priceChip}>
            <Text style={styles.priceText}>{formatCurrency(item.priceSYP)}</Text>
          </View>
          <View style={styles.totalChip}>
            <Text style={styles.totalText}>
              الإجمالي: {formatCurrency(item.totalSYP)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionFooter}>
          <Text style={styles.itemDateText}>{item.date} - {item.time}</Text>
          <TouchableOpacity
            style={styles.deleteTransactionButton}
            onPress={() => deleteTransaction(debtor, item)}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style='light' />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
          <Image source={require('./assets/icon.png')} style={{ width: 40, height: 40, transform: [{ scale: 1.8 }] }} />
          <Text style={styles.title}>مدير الديون</Text>
        </View>
        <View style={styles.headerControls}>
          <TouchableOpacity style={styles.currencySwitchContainer} onPress={handleCurrencySwitch}>
            <Text style={styles.currencyLabel}>{isUSD ? '$' : 'ل.س'}</Text>
            {/* <Switch
              value={isUSD}
              onValueChange={handleCurrencySwitch}
              trackColor={{ false: '#767577', true: '#3498db' }}
              thumbColor={isUSD ? '#fff' : '#f4f3f4'}
            /> */}
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={exportData}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setImportModalVisible(true)}>
              <Ionicons name="download-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#adb5bd" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن مدين..."
          placeholderTextColor="#adb5bd"
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color="#476d92" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { flex: 4 }]}>
                <View style={styles.statIconContainer}>
                  <MaterialIcons name="attach-money" size={24} color="#3498db" />
                </View>
                <Text style={styles.statLabel}>إجمالي الديون</Text>
                <Text style={styles.statValue}>{stats.totalDebtFormatted}</Text>
                {isUSD && (
                  <Text style={styles.exchangeRateNote}>
                    بسعر صرف: 1$ = {exchangeRate.toLocaleString()} ل.س
                  </Text>
                )}
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={24} color="#2ecc71" />
                </View>
                <Text style={styles.statLabel}>المدينين</Text>
                <Text style={styles.statValue}>{stats.totalDebtors}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={() => setAddDebtorModal(true)}>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>إضافة مدين جديد</Text>
            </TouchableOpacity>
          </View>
        }
        data={filteredDebtors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.debtorCard}>
            <View style={styles.debtorHeader}>
              <View style={styles.debtorInfo}>
                <Text style={styles.debtorName}>{item.name}</Text>
              </View>
              <View style={styles.debtorActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.addDebtButton]}
                  onPress={() => {
                    setSelectedDebtor(item);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.payButton]}
                  onPress={() => {
                    setSelectedDebtor(item);
                    setPaymentModal(true);
                  }}
                >
                  <Ionicons name="wallet" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={() => shareDebtorDetails(item)}
                >
                  <Ionicons name="share-social" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteDebtor(item)}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.debtorTotal}>
              <Text style={styles.totalLabel}>المبلغ الكامل:</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(item.totalDebtSYP)}
              </Text>
            </View>
            {item.debts.length > 0 && (
              <View style={styles.debtsList}>
                <Text style={styles.debtsTitle}>
                  <Ionicons name="time" size={14} color="#6e8aa3" /> سجل المعاملات الـ {item.debts.length}
                </Text>
                {item.debts.slice().reverse().map((debt) => renderDebtItem(debt, item))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#628fbe" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد مدينين حتى الآن'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'جرب كلمة بحث مختلفة' : 'اضغط على "إضافة مدين جديد" للبدء'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View>
            <Text style={{ textAlign: 'center', color: '#929ca8', fontSize: 12, fontWeight: '200' }}>Powered by @bashar1_x</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Debtor Modal */}
      <Modal visible={addDebtorModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة مدين جديد</Text>
              <TouchableOpacity onPress={() => setAddDebtorModal(false)}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <Text style={styles.lableInput}>اسم العميل</Text>
            <TextInput
              style={styles.input}
              placeholder="اسم المدين"
              placeholderTextColor="#adb5bd"
              value={newDebtorName}
              onChangeText={setNewDebtorName}
              textAlign="right"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => setAddDebtorModal(false)}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveModalButton]} onPress={addDebtor}>
                <Text style={styles.modalButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة دين على {selectedDebtor?.name}</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setSelectedDebtor(null);
                setNewDebtItem({ itemName: '', priceSYP: '', quantity: '1' });
              }}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <Text style={styles.lableInput}>اسم المادة</Text>
            <TextInput
              style={styles.input}
              placeholder="اسم المادة"
              placeholderTextColor="#adb5bd"
              value={newDebtItem.itemName}
              onChangeText={(text) => setNewDebtItem({ ...newDebtItem, itemName: text })}
              textAlign="right"
            />
            <Text style={styles.lableInput}>سعر القطعة {isUSD ? '(دولار)' : '(ل.س)'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isUSD ? "السعر بالدولار" : "السعر بالليرة السورية"}
              placeholderTextColor="#adb5bd"
              keyboardType="numeric"
              value={newDebtItem.priceSYP}
              onChangeText={(text) => setNewDebtItem({ ...newDebtItem, priceSYP: text })}
              textAlign="right"
            />
            <Text style={styles.lableInput}>كم قطعة</Text>
            <TextInput
              style={styles.input}
              placeholder="الكمية"
              placeholderTextColor="#adb5bd"
              keyboardType="numeric"
              value={newDebtItem.quantity}
              onChangeText={(text) => setNewDebtItem({ ...newDebtItem, quantity: text })}
              textAlign="right"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => {
                setModalVisible(false);
                setSelectedDebtor(null);
                setNewDebtItem({ itemName: '', priceSYP: '', quantity: '1' });
              }}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveModalButton]} onPress={addDebt}>
                <Text style={styles.modalButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text numberOfLines={1} style={styles.modalTitle}>تسديد دفعة لـ {selectedDebtor?.name}</Text>
              <TouchableOpacity onPress={() => {
                setPaymentModal(false);
                setSelectedDebtor(null);
                setPaymentAmount('');
              }}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <Text style={styles.paymentInfoText}>
              المبلغ الكامل: {selectedDebtor ? formatCurrency(selectedDebtor.totalDebtSYP) : '0'}
            </Text>
            <Text style={styles.lableInput}>مبلغ الدفعة {isUSD ? '(دولار)' : '(ل.س)'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isUSD ? "المبلغ بالدولار" : "المبلغ بالليرة السورية"}
              placeholderTextColor="#adb5bd"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              textAlign="right"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => {
                setPaymentModal(false);
                setSelectedDebtor(null);
                setPaymentAmount('');
              }}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveModalButton]} onPress={makePayment}>
                <Text style={styles.modalButtonText}>تسديد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={importModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.importModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>استيراد بيانات</Text>
              <TouchableOpacity onPress={() => {
                setImportModalVisible(false);
                setImportJsonText('');
              }}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <Text style={styles.importLabel}>الصق محتوى ملف JSON هنا:</Text>
            <TextInput
              style={[styles.input, styles.importTextInput]}
              placeholder='{"debtors": [...]}'
              placeholderTextColor="#adb5bd"
              value={importJsonText}
              onChangeText={setImportJsonText}
              textAlign="left"
              multiline
              numberOfLines={8}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => {
                setImportModalVisible(false);
                setImportJsonText('');
              }}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveModalButton]} onPress={importData}>
                <Text style={styles.modalButtonText}>استيراد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exchange Rate Modal */}
      <Modal visible={exchangeModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>سعر صرف الدولار</Text>
              <TouchableOpacity onPress={() => {
                setExchangeModalVisible(false);
                setIsUSD(false);
              }}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <Text style={styles.exchangeRateDescription}>
              قم بإدخال سعر صرف الدولار مقابل الليرة السورية
            </Text>
            <Text style={styles.lableInput}>سعر الصرف</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 15000"
              placeholderTextColor="#adb5bd"
              keyboardType="numeric"
              value={tempExchangeRate}
              onChangeText={setTempExchangeRate}
              textAlign="right"
            />
            <Text style={styles.exchangeRateHint}>
              سيتم استخدام هذا السعر لتحويل جميع المبالغ بين الليرة والدولار
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => {
                setExchangeModalVisible(false);
                setIsUSD(false);
              }}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveModalButton]} onPress={confirmExchangeRate}>
                <Text style={styles.modalButtonText}>تأكيد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 40,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 15,
  },
  currencySwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 42,
    height: 42,
    borderRadius: 30,
  },
  currencyLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: 'right',
  },
  clearSearchButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: 3,
    marginBottom: 16,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 6,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  exchangeRateNote: {
    fontSize: 10,
    color: '#95a5a6',
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#3498db',
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  debtorCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  debtorHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtorInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  debtorName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#3d5c7a',
    maxWidth: '140',
    textAlign: 'right',
  },
  debtorActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDebtButton: {
    backgroundColor: '#2ecc71',
  },
  payButton: {
    backgroundColor: '#f39c12',
  },
  shareButton: {
    backgroundColor: '#9b59b6',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  debtorTotal: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22',
  },
  debtsList: {
    marginTop: 8,
  },
  debtsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 10,
  },
  debtItemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  paymentItem: {
    backgroundColor: '#e8f8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d4efdf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentContent: {
    flex: 1,
  },
  debtItemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  itemNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  quantityBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  quantityText: {
    fontSize: 12,
    color: '#6c757d',
  },
  debtItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  priceChip: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 12,
    color: '#6c757d',
  },
  totalChip: {
    backgroundColor: '#fdebd0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67e22',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },
  itemDateText: {
    fontSize: 12,
    color: '#a0a4a8',
    marginTop: 6,
    flex: 1,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  deleteTransactionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  importModalContent: {
    maxWidth: 500,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  lableInput: {
    textAlign: 'right',
    right: 10,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#4d7aa7',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
    fontSize: 17,
    fontWeight: 'bold',
    backgroundColor: '#f8f9fa',
    textAlign: 'right',
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    fontWeight: '500',
  },
  importTextInput: {
    textAlign: 'left',
    fontSize: 12,
    minHeight: 150,
  },
  importLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f1f3f5',
  },
  saveModalButton: {
    backgroundColor: '#3498db',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  exchangeRateDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'right',
    marginBottom: 15,
  },
  exchangeRateHint: {
    fontSize: 12,
    color: '#ee7a6b',
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 15,
  },
});
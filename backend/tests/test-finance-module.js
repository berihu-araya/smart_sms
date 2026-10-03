/**
 * Integration Test Script for Finance Module Backend
 */
const { db } = require('../src/config/database');
const FinanceRepository = require('../src/modules/finance/finance.repository');
const FinanceService = require('../src/modules/finance/finance.service');

async function testFinanceModule() {
  console.log('--- STARTING FINANCE MODULE TESTS ---');
  const repo = new FinanceRepository(db);
  const service = new FinanceService(repo, db);

  try {
    // 1. Test Settings
    console.log('1. Testing Finance Settings...');
    const settings = await repo.getSettings(null);
    console.log('   Settings fetched:', settings.currency_symbol);

    // 2. Test Fee Category creation
    console.log('2. Testing Fee Category Creation...');
    const testCategory = await repo.createFeeCategory(null, {
      name: `Test Tuition Fee ${Date.now()}`,
      code: `TTUI_${Date.now().toString().slice(-4)}`,
      description: 'Standard tuition test fee',
    });
    console.log('   Fee Category Created:', testCategory.id, testCategory.code);

    // 3. Test Fee Structure creation
    console.log('3. Testing Fee Structure Creation...');
    const testStructure = await repo.createFeeStructure(null, {
      fee_category_id: testCategory.id,
      name: 'Grade 9 Monthly Tuition Test',
      amount: 2500.00,
      frequency: 'MONTHLY',
    });
    console.log('   Fee Structure Created:', testStructure.id, testStructure.amount);

    // 4. Test KPI Overview
    console.log('4. Testing Finance KPIs Overview...');
    const kpis = await repo.getOverviewKPIs(null);
    console.log('   KPI Summary:', {
      totalInvoiced: kpis.totalInvoiced,
      totalCollected: kpis.totalCollected,
      collectionEfficiency: kpis.collectionEfficiency,
    });

    // 5. Test Payroll Processing
    console.log('5. Testing Payroll Processing...');
    const usersRes = await db.query(`SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1`);
    if (usersRes.rows.length > 0) {
      const testUser = usersRes.rows[0];
      await repo.upsertSalaryStructure(null, {
        user_id: testUser.id,
        base_salary: 12000,
        housing_allowance: 2000,
        transport_allowance: 1000,
        medical_allowance: 500,
        other_allowances: 0,
        tax_rate_percentage: 0,
        pension_employee_percentage: 7.0,
        pension_employer_percentage: 11.0,
      });

      const testMonth = 11;
      const testYear = 2029;
      // Clean previous run if exists
      await db.query(`DELETE FROM payroll_runs WHERE month = $1 AND year = $2`, [testMonth, testYear]);

      const payrollRun = await service.processMonthlyPayroll(null, testUser.id, {
        month: testMonth,
        year: testYear,
        remarks: 'Test automated payroll',
      });
      console.log('   Payroll Run Processed:', payrollRun.batchReference, 'Staff Count:', payrollRun.totalStaffCount, 'Net Total:', payrollRun.totalNet);

      // Clean up test payroll run
      await db.query(`DELETE FROM payroll_runs WHERE id = $1`, [payrollRun.id]);
    }

    // 6. Clean up test records
    await repo.deleteFeeStructure(testStructure.id, null);
    await repo.deleteFeeCategory(testCategory.id, null);
    console.log('6. Test clean up completed.');

    console.log('--- ALL FINANCE MODULE TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  }
}

testFinanceModule();

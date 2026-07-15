<?php

namespace Tests\Feature;

use App\Models\Campus;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\GeneratedVoucher;
use App\Models\FeeHead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VoucherGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_voucher_generation_and_recalculation(): void
    {
        // Seed roles & permissions
        $this->seed(\Database\Seeders\PermissionsSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        // 1. Create Organization, Campus, Student, and FeeHead
        $org = Organization::create(['name' => 'Test Org', 'slug' => 'test-org']);
        $campus = Campus::create([
            'organization_id' => $org->id,
            'name' => 'Test Campus',
            'code' => 'TC'
        ]);
        $student = Student::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'admission_number' => 'ADM-001',
            'roll_number' => '1001',
            'status' => 'Enrolled',
            'gender' => 'male',
            'admission_date' => '2026-07-15',
        ]);
        $feeHead = FeeHead::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'name' => 'Tuition Fee',
            'frequency' => 'semester'
        ]);

        // 2. Create StudentFee records
        $fee1 = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead->id,
            'amount' => 10000.00,
            'due_date' => now()->addDays(10),
            'semester_number' => 1,
        ]);

        $fee2 = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead->id,
            'amount' => 5000.00,
            'due_date' => now()->addDays(10),
            'semester_number' => 1,
        ]);

        // Arrears fee
        $arrearsFee = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead->id,
            'amount' => 3000.00,
            'due_date' => now()->subMonths(6),
            'semester_number' => 0, // previous semester
        ]);

        // Assert initially voucher_number is null
        $this->assertNull($fee1->voucher_number);
        $this->assertNull($fee2->voucher_number);
        $this->assertNull($arrearsFee->voucher_number);

        // 3. Create user and assign super_admin role
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
        ]);
        $user->assignRole('super_admin');

        $response = $this->actingAs($user, 'api')
            ->withHeaders(['X-Organization-ID' => $org->id, 'X-Campus-ID' => $campus->id])
            ->postJson('/api/student-fees/vouchers/generate', [
                'student_id' => $student->id,
                'semester_number' => 1,
            ]);

        $response->assertStatus(200);

        // 4. Assert GeneratedVoucher and StudentFee records updated
        $voucher = GeneratedVoucher::where('student_id', $student->id)->first();
        $this->assertNotNull($voucher);
        $this->assertEquals(15000.00, $voucher->amount);
        $this->assertEquals(3000.00, $voucher->arrears_amount);
        $this->assertEquals(18000.00, $voucher->balance_amount);
        $this->assertEquals('unpaid', $voucher->status);

        $fee1->refresh();
        $fee2->refresh();
        $arrearsFee->refresh();
        $this->assertEquals($voucher->voucher_number, $fee1->voucher_number);
        $this->assertEquals($voucher->voucher_number, $fee2->voucher_number);
        $this->assertNull($arrearsFee->voucher_number);

        // 5. Pay a fee and assert voucher is recalculated
        $fee1->update(['paid_amount' => 10000.00]);
        $voucher->refresh();
        $this->assertEquals(8000.00, $voucher->balance_amount);
        $this->assertEquals('partial', $voucher->status);

        // Pay remaining
        $fee2->update(['paid_amount' => 5000.00]);
        $arrearsFee->update(['paid_amount' => 3000.00]);
        $voucher->refresh();
        $this->assertEquals(0.00, $voucher->balance_amount);
        $this->assertEquals('paid', $voucher->status);

        // Try deleting paid voucher - should fail
        $deleteResponse = $this->actingAs($user, 'api')
            ->deleteJson("/api/student-fees/vouchers/{$voucher->id}");
        $deleteResponse->assertStatus(400);

        // Reset paid to unpaid
        $fee1->update(['paid_amount' => 0.00]);
        $fee2->update(['paid_amount' => 0.00]);
        $arrearsFee->update(['paid_amount' => 0.00]);
        $voucher->refresh();
        $this->assertEquals('unpaid', $voucher->status);

        // Delete unpaid voucher - should succeed
        $deleteResponse = $this->actingAs($user, 'api')
            ->deleteJson("/api/student-fees/vouchers/{$voucher->id}");
        $deleteResponse->assertStatus(200);

        // Assert voucher deleted and fees dissociated
        $this->assertNull(GeneratedVoucher::find($voucher->id));
        $fee1->refresh();
        $this->assertNull($fee1->voucher_number);
    }

    public function test_voucher_auto_backfill_when_missing(): void
    {
        $this->seed(\Database\Seeders\PermissionsSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $org = Organization::create(['name' => 'Test Org', 'slug' => 'test-org']);
        $campus = Campus::create([
            'organization_id' => $org->id,
            'name' => 'Test Campus',
            'code' => 'TC'
        ]);
        $student = Student::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'admission_number' => 'ADM-001',
            'roll_number' => '1001',
            'status' => 'Enrolled',
            'gender' => 'male',
            'admission_date' => '2026-07-15',
        ]);
        $feeHead = FeeHead::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'name' => 'Tuition Fee',
            'frequency' => 'semester'
        ]);

        // Create student fee with pre-existing voucher_number but NO GeneratedVoucher record
        $fee = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead->id,
            'amount' => 8000.00,
            'due_date' => now()->addDays(10),
            'semester_number' => 1,
            'voucher_number' => 'PRE-EXISTING-123',
        ]);

        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
        ]);
        $user->assignRole('super_admin');

        // Initially no GeneratedVoucher exists
        $this->assertEquals(0, GeneratedVoucher::where('voucher_number', 'PRE-EXISTING-123')->count());

        // Hit the print voucher endpoint
        $response = $this->actingAs($user, 'api')
            ->withHeaders(['X-Organization-ID' => $org->id, 'X-Campus-ID' => $campus->id])
            ->getJson("/api/student-fees/voucher/{$student->id}?voucher_number=PRE-EXISTING-123");

        $response->assertStatus(200);

        // Verify that the GeneratedVoucher record has been automatically healed/created!
        $this->assertEquals(1, GeneratedVoucher::where('voucher_number', 'PRE-EXISTING-123')->count());
        $voucher = GeneratedVoucher::where('voucher_number', 'PRE-EXISTING-123')->first();
        $this->assertEquals(8000.00, $voucher->amount);
        $this->assertEquals('unpaid', $voucher->status);
    }

    public function test_voucher_payment_allocation_integrity(): void
    {
        $this->seed(\Database\Seeders\PermissionsSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $org = Organization::create(['name' => 'Test Org', 'slug' => 'test-org']);
        $campus = Campus::create(['organization_id' => $org->id, 'name' => 'Test Campus', 'code' => 'TC']);
        $student = Student::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'admission_number' => 'ADM-002',
            'roll_number' => '1002',
            'status' => 'Enrolled',
            'gender' => 'female',
            'admission_date' => '2026-07-15',
        ]);
        $feeHead1 = FeeHead::create(['organization_id' => $org->id, 'campus_id' => $campus->id, 'name' => 'Admission Fee', 'frequency' => 'once']);
        $feeHead2 = FeeHead::create(['organization_id' => $org->id, 'campus_id' => $campus->id, 'name' => 'Semester Fee', 'frequency' => 'semester']);

        // Voucher 1 fees
        $v1Admission = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead1->id,
            'amount' => 15000.00,
            'due_date' => now()->subMonths(3),
            'semester_number' => 1,
        ]);
        $v1Semester = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead2->id,
            'amount' => 45000.00,
            'due_date' => now()->subMonths(3),
            'semester_number' => 1,
        ]);

        // Voucher 2 fees
        $v2Semester = StudentFee::create([
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
            'student_id' => $student->id,
            'fee_head_id' => $feeHead2->id,
            'amount' => 90000.00,
            'due_date' => now()->addDays(10),
            'semester_number' => 2,
        ]);

        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'organization_id' => $org->id,
            'campus_id' => $campus->id,
        ]);
        $user->assignRole('super_admin');

        // Generate Voucher 1
        $this->actingAs($user, 'api')
            ->withHeaders(['X-Organization-ID' => $org->id, 'X-Campus-ID' => $campus->id])
            ->postJson('/api/student-fees/vouchers/generate', [
                'student_id' => $student->id,
                'semester_number' => 1,
            ]);

        $v1 = GeneratedVoucher::where('student_id', $student->id)->where('semester_number', 1)->first();
        $this->assertNotNull($v1);

        // Generate Voucher 2
        $this->actingAs($user, 'api')
            ->withHeaders(['X-Organization-ID' => $org->id, 'X-Campus-ID' => $campus->id])
            ->postJson('/api/student-fees/vouchers/generate', [
                'student_id' => $student->id,
                'semester_number' => 2,
            ]);

        $v2 = GeneratedVoucher::where('student_id', $student->id)->where('semester_number', 2)->first();
        $this->assertNotNull($v2);

        // Assert that Voucher 1 fees keep their voucher number and Voucher 2 has its own
        $v1Admission->refresh();
        $v1Semester->refresh();
        $v2Semester->refresh();
        $this->assertEquals($v1->voucher_number, $v1Admission->voucher_number);
        $this->assertEquals($v1->voucher_number, $v1Semester->voucher_number);
        $this->assertEquals($v2->voucher_number, $v2Semester->voucher_number);

        // Record a payment against Voucher 2
        $response = $this->actingAs($user, 'api')
            ->withHeaders(['X-Organization-ID' => $org->id, 'X-Campus-ID' => $campus->id])
            ->postJson('/api/student-fees/deposit', [
                'student_id' => $student->id,
                'amount' => 50000.00,
                'payment_date' => now()->format('Y-m-d'),
                'payment_method' => 'Cash',
                'voucher_number' => $v2->voucher_number,
            ]);

        $response->assertStatus(200);

        // Assert that payment was ONLY applied to Voucher 2 fees
        $v1Admission->refresh();
        $v1Semester->refresh();
        $v2Semester->refresh();

        // Voucher 1 fees must remain completely unpaid
        $this->assertEquals(0.00, $v1Admission->paid_amount);
        $this->assertEquals(0.00, $v1Semester->paid_amount);

        // Voucher 2 fees must receive the payment
        $this->assertEquals(50000.00, $v2Semester->paid_amount);
        $this->assertEquals(40000.00, $v2Semester->balance_amount);
    }
}

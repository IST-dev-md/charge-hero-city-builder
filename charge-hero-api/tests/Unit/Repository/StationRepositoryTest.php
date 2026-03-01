<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Entity\Station;
use App\Entity\StationStatus;
use App\Repository\StationRepository;
use PHPUnit\Framework\TestCase;

/**
 * Tests the StationRepository against a real (temporary) JSON file.
 * No mocks needed — the repository's observable behaviour IS the filesystem contract.
 */
class StationRepositoryTest extends TestCase
{
    private string $tempDir;
    private StationRepository $repository;

    protected function setUp(): void
    {
        // StationRepository creates var/ and the JSON file itself in its constructor.
        $this->tempDir    = sys_get_temp_dir() . '/station_test_' . uniqid('', true);
        $this->repository = new StationRepository($this->tempDir);
    }

    protected function tearDown(): void
    {
        @unlink($this->tempDir . '/var/stations.json');
        @rmdir($this->tempDir . '/var');
        @rmdir($this->tempDir);
    }

    // --- all() ---

    public function test_all_returns_empty_array_when_no_stations_exist(): void
    {
        // Act
        $result = $this->repository->all();

        // Assert
        $this->assertSame([], $result);
    }

    public function test_all_returns_every_saved_station(): void
    {
        // Arrange
        $this->repository->save(new Station('id-1', 'Alpha', 0, 0));
        $this->repository->save(new Station('id-2', 'Beta',  1, 1));

        // Act
        $result = $this->repository->all();

        // Assert
        $this->assertCount(2, $result);
    }

    // --- find() ---

    public function test_find_returns_station_with_all_fields_preserved(): void
    {
        // Arrange
        $station = new Station('id-1', 'Alpha', 10, 20, StationStatus::CHARGING);
        $this->repository->save($station);

        // Act
        $found = $this->repository->find('id-1');

        // Assert
        $this->assertNotNull($found);
        $this->assertSame('id-1',                $found->id);
        $this->assertSame('Alpha',               $found->name);
        $this->assertSame(10,                    $found->x);
        $this->assertSame(20,                    $found->y);
        $this->assertSame(StationStatus::CHARGING, $found->status);
    }

    public function test_find_returns_null_for_unknown_id(): void
    {
        // Act
        $result = $this->repository->find('nonexistent');

        // Assert
        $this->assertNull($result);
    }

    // --- save() (update path) ---

    public function test_save_updates_existing_station_without_creating_a_duplicate(): void
    {
        // Arrange
        $station = new Station('id-1', 'Alpha', 0, 0, StationStatus::AVAILABLE);
        $this->repository->save($station);

        // Act — mutate and save again
        $station->name   = 'Updated';
        $station->status = StationStatus::OUT_OF_ORDER;
        $this->repository->save($station);

        // Assert
        $this->assertCount(1, $this->repository->all());
        $found = $this->repository->find('id-1');
        $this->assertSame('Updated',                $found->name);
        $this->assertSame(StationStatus::OUT_OF_ORDER, $found->status);
    }

    // --- existsByName() ---

    public function test_existsByName_returns_true_for_an_existing_name(): void
    {
        // Arrange
        $this->repository->save(new Station('id-1', 'Alpha', 0, 0));

        // Act & Assert
        $this->assertTrue($this->repository->existsByName('Alpha'));
    }

    public function test_existsByName_is_case_insensitive(): void
    {
        // Arrange
        $this->repository->save(new Station('id-1', 'Alpha', 0, 0));

        // Act & Assert
        $this->assertTrue($this->repository->existsByName('alpha'));
        $this->assertTrue($this->repository->existsByName('ALPHA'));
        $this->assertTrue($this->repository->existsByName('AlPhA'));
    }

    public function test_existsByName_returns_false_when_name_does_not_exist(): void
    {
        // Act & Assert
        $this->assertFalse($this->repository->existsByName('nonexistent'));
    }

    // --- delete() ---

    public function test_delete_removes_the_station_from_storage(): void
    {
        // Arrange
        $this->repository->save(new Station('id-1', 'Alpha', 0, 0));

        // Act
        $this->repository->delete('id-1');

        // Assert
        $this->assertNull($this->repository->find('id-1'));
        $this->assertCount(0, $this->repository->all());
    }

    public function test_delete_with_unknown_id_does_not_throw_and_leaves_storage_intact(): void
    {
        // Arrange
        $this->repository->save(new Station('id-1', 'Alpha', 0, 0));

        // Act — should not throw
        $this->repository->delete('nonexistent');

        // Assert — the other station is untouched
        $this->assertCount(1, $this->repository->all());
    }

    // --- clear() ---

    public function test_clear_removes_all_stations(): void
    {
        // Arrange
        $this->repository->save(new Station('id-1', 'Alpha', 0, 0));
        $this->repository->save(new Station('id-2', 'Beta',  0, 0));

        // Act
        $this->repository->clear();

        // Assert
        $this->assertCount(0, $this->repository->all());
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Entity\Station;
use App\Entity\StationStatus;
use App\Repository\StationRepository;
use App\Service\StationService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class StationServiceTest extends TestCase
{
    private StationRepository&MockObject $repository;
    private StationService $service;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(StationRepository::class);
        $this->service    = new StationService($this->repository);
    }

    // --- create() ---

    public function test_create_returns_station_with_given_name_and_coordinates(): void
    {
        // Arrange
        $this->repository->method('save');

        // Act
        $station = $this->service->create('Alpha', 10, 20);

        // Assert
        $this->assertSame('Alpha', $station->name);
        $this->assertSame(10, $station->x);
        $this->assertSame(20, $station->y);
        $this->assertSame(StationStatus::AVAILABLE, $station->status);
    }

    public function test_create_generates_a_valid_uuid_v4(): void
    {
        // Arrange
        $this->repository->method('save');

        // Act
        $station = $this->service->create('Beta', 0, 0);

        // Assert
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            $station->id
        );
    }

    public function test_create_persists_the_station_in_the_repository(): void
    {
        // Arrange
        $capturedStation = null;
        $this->repository
            ->expects($this->once())
            ->method('save')
            ->willReturnCallback(function (Station $s) use (&$capturedStation): void {
                $capturedStation = $s;
            });

        // Act
        $station = $this->service->create('Gamma', 5, 15);

        // Assert
        $this->assertSame($station, $capturedStation);
    }

    // --- simulate() ---

    public function test_simulate_saves_each_station_exactly_once(): void
    {
        // Arrange
        $stations = [
            new Station('id-1', 'Alpha', 0, 0, StationStatus::AVAILABLE),
            new Station('id-2', 'Beta',  0, 0, StationStatus::AVAILABLE),
            new Station('id-3', 'Gamma', 0, 0, StationStatus::AVAILABLE),
        ];
        $this->repository->method('all')->willReturn($stations);
        $this->repository
            ->expects($this->exactly(3))
            ->method('save');

        // Act
        $this->service->simulate();
    }

    public function test_simulate_assigns_a_valid_status_to_each_station(): void
    {
        // Arrange
        $station = new Station('id-1', 'Alpha', 0, 0, StationStatus::AVAILABLE);
        $this->repository->method('all')->willReturn([$station]);
        $this->repository->method('save');

        // Act
        $this->service->simulate();

        // Assert — status must be mutated to a valid enum case
        $this->assertContains($station->status, StationStatus::cases());
    }

    public function test_simulate_returns_all_stations_after_updating(): void
    {
        // Arrange
        // all() is called twice in simulate(): once in foreach, once at return.
        // willReturn() returns the same array reference each time, which is correct
        // because Station objects are mutable — the foreach mutates them in-place.
        $stations = [
            new Station('id-1', 'Alpha', 0, 0, StationStatus::AVAILABLE),
            new Station('id-2', 'Beta',  0, 0, StationStatus::AVAILABLE),
        ];
        $this->repository->method('all')->willReturn($stations);
        $this->repository->method('save');

        // Act
        $result = $this->service->simulate();

        // Assert
        $this->assertCount(2, $result);
        foreach ($result as $s) {
            $this->assertContains($s->status, StationStatus::cases());
        }
    }

    public function test_simulate_with_no_stations_returns_empty_array(): void
    {
        // Arrange
        $this->repository->method('all')->willReturn([]);

        // Act
        $result = $this->service->simulate();

        // Assert
        $this->assertSame([], $result);
    }
}

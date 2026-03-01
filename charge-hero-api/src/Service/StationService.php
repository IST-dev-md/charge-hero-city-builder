<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Station;
use App\Entity\StationStatus;
use App\Repository\StationRepository;

class StationService
{
    public function __construct(
        private StationRepository $repository,
    ) {}

    public function create(string $name, int $x, int $y): Station
    {
        $station = new Station(
            id: $this->generateUuid(),
            name: $name,
            x: $x,
            y: $y,
        );

        $this->repository->save($station);

        return $station;
    }

    public function simulate(): array
    {
        $statuses = StationStatus::cases();

        foreach ($this->repository->all() as $station) {
            $station->status = $statuses[array_rand($statuses)];
            $this->repository->save($station);
        }

        return $this->repository->all();
    }

    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        );
    }
}

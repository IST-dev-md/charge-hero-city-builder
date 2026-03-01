<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Station;
use App\Entity\StationStatus;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class StationRepository
{
    private string $file;

    public function __construct(
        #[Autowire('%kernel.project_dir%')]
        string $projectDir
    ) {
        $this->file = $projectDir . '/var/stations.json';

        if (!is_dir(dirname($this->file))) {
            mkdir(dirname($this->file), 0777, true);
        }

        if (!file_exists($this->file)) {
            file_put_contents($this->file, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    /** @return Station[] */
    public function all(): array
    {
        $data = $this->read();
        return array_map([$this, 'hydrate'], $data);
    }

    public function find(string $id): ?Station
    {
        $data = $this->read();
        return isset($data[$id]) ? $this->hydrate($data[$id]) : null;
    }

    public function existsByName(string $name): bool
    {
        $name = mb_strtolower(trim($name));

        foreach ($this->read() as $row) {
            if (mb_strtolower((string) ($row['name'] ?? '')) === $name) {
                return true;
            }
        }

        return false;
    }

    public function save(Station $station): void
    {
        $data = $this->read();

        $data[$station->id] = [
            'id' => $station->id,
            'name' => $station->name,
            'x' => $station->x,
            'y' => $station->y,
            'status' => $station->status->value,
        ];

        $this->write($data);
    }

    public function delete(string $id): void
    {
        $data = $this->read();
        unset($data[$id]);
        $this->write($data);
    }

    // 🔥 NOUVELLE MÉTHODE
    public function clear(): void
    {
        $this->write([]);
    }

    private function read(): array
    {
        $raw = (string) @file_get_contents($this->file);
        $arr = json_decode($raw ?: '[]', true);

        return is_array($arr) ? $arr : [];
    }

    private function write(array $data): void
    {
        $fp = fopen($this->file, 'c+');
        if ($fp === false) {
            return;
        }

        try {
            flock($fp, LOCK_EX);
            ftruncate($fp, 0);
            fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
        } finally {
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }

    private function hydrate(array $row): Station
    {
        return new Station(
            id: (string) $row['id'],
            name: (string) $row['name'],
            x: (int) $row['x'],
            y: (int) $row['y'],
            status: StationStatus::from((string) $row['status'])
        );
    }
}
<?php

declare(strict_types=1);

namespace App\Entity;

class Station implements \JsonSerializable
{
    public function __construct(
        public readonly string $id,
        public string $name,
        public int $x,
        public int $y,
        public StationStatus $status = StationStatus::AVAILABLE,
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id'     => $this->id,
            'name'   => $this->name,
            'x'      => $this->x,
            'y'      => $this->y,
            'status' => $this->status->value,
        ];
    }
}

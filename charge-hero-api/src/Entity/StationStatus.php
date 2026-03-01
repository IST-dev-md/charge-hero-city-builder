<?php

declare(strict_types=1);

namespace App\Entity;

enum StationStatus: string
{
    case AVAILABLE = 'available';
    case CHARGING = 'charging';
    case OUT_OF_ORDER = 'out_of_order';
}

package com.khadyabachao.stats;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface DailyStatsRepository extends JpaRepository<DailyStats, LocalDate> {
    List<DailyStats> findTop14ByOrderByDateDesc();
}

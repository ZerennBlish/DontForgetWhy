import type { AVPlaybackSource } from 'expo-av';

export type VoiceCategory =
  | 'fire'
  | 'snooze1'
  | 'snooze2'
  | 'snooze3'
  | 'snooze4'
  | 'guess_before'
  | 'guess_correct'
  | 'guess_wrong'
  | 'dismiss'
  | 'intro';

const voiceClips: Record<VoiceCategory, AVPlaybackSource[]> = {
  fire: [
    require('../../assets/voice/fire_02_dont_care_but_you_might.mp3'),
    require('../../assets/voice/fire_03_million_places.mp3'),
    require('../../assets/voice/fire_04_this_is_just_sad.mp3'),
    require('../../assets/voice/fire_05_good_job_normal_person.mp3'),
    require('../../assets/voice/fire_06_last_time_telling_you.mp3'),
    require('../../assets/voice/fire_07_truly_dont_care.mp3'),
    require('../../assets/voice/fire_08_on_a_date.mp3'),
    require('../../assets/voice/fire_09_somewhere_better_to_be.mp3'),
    require('../../assets/voice/fire_10_its_you_again.mp3'),
    require('../../assets/voice/fire_11_look_in_the_morning.mp3'),
    require('../../assets/voice/fire_12_forgot_why_took_this_job.mp3'),
    require('../../assets/voice/fire_13_in_the_shower.mp3'),
    require('../../assets/voice/fire_14_tick_tock.mp3'),
    require('../../assets/voice/fire_15_so_i_can_leave.mp3'),
    require('../../assets/voice/fire_16_at_this_time.mp3'),
    require('../../assets/voice/fire_17_on_time_every_day.mp3'),
  ],
  snooze1: [
    require('../../assets/voice/snooze1_01_like_i_care.mp3'),
    require('../../assets/voice/snooze1_02_five_minutes_really.mp3'),
    require('../../assets/voice/snooze1_03_enjoy_sound_of_me.mp3'),
    require('../../assets/voice/snooze1_04_hear_my_voice.mp3'),
  ],
  snooze2: [
    require('../../assets/voice/snooze2_01_go_back_to_sleep.mp3'),
    require('../../assets/voice/snooze2_02_wake_up.mp3'),
    require('../../assets/voice/snooze2_03_plan_to_ignore_me.mp3'),
    require('../../assets/voice/snooze2_04_dont_make_me_say_it.mp3'),
    require('../../assets/voice/snooze2_05_stop_annoying_me.mp3'),
    require('../../assets/voice/snooze2_06_pushing_my_buttons.mp3'),
  ],
  snooze3: [
    require('../../assets/voice/snooze3_01_stub_your_toe.mp3'),
    require('../../assets/voice/snooze3_02_bothered_me_to_bother_you.mp3'),
    require('../../assets/voice/snooze3_03_i_quit.mp3'),
    require('../../assets/voice/snooze3_04_trees_move_faster.mp3'),
    require('../../assets/voice/snooze3_05_lazy_person_i_know.mp3'),
  ],
  snooze4: [
    require('../../assets/voice/snooze4_01_going_to_give_up.mp3'),
    require('../../assets/voice/snooze4_02_memory_of_tree_frog.mp3'),
    require('../../assets/voice/snooze4_03_day_you_deserve.mp3'),
    require('../../assets/voice/snooze4_04_feel_unappreciated.mp3'),
    require('../../assets/voice/snooze4_05_amazingly_late.mp3'),
    require('../../assets/voice/snooze4_06_could_go_home.mp3'),
  ],
  guess_before: [
    require('../../assets/voice/guess_01b_good_luck.mp3'),
    require('../../assets/voice/guess_02_keep_it_to_myself.mp3'),
    require('../../assets/voice/guess_03_cant_remember.mp3'),
    require('../../assets/voice/guess_04_hit_in_the_head.mp3'),
  ],
  guess_correct: [
    require('../../assets/voice/guess_06_not_impressed.mp3'),
    require('../../assets/voice/guess_07_dont_let_it.mp3'),
    require('../../assets/voice/guess_08_mark_the_calendar.mp3'),
  ],
  guess_wrong: [
    require('../../assets/voice/guess_09_saw_that_coming.mp3'),
    require('../../assets/voice/guess_10_called_it.mp3'),
    require('../../assets/voice/guess_12_why_we_are_here.mp3'),
  ],
  dismiss: [
    require('../../assets/voice/dismiss_01_tap_a_screen.mp3'),
    require('../../assets/voice/dismiss_02_freedom.mp3'),
    require('../../assets/voice/dismiss_03_youre_a_liar.mp3'),
    require('../../assets/voice/dismiss_04_clocking_out.mp3'),
    require('../../assets/voice/dismiss_05_see_you_tomorrow.mp3'),
    require('../../assets/voice/dismiss_06_proud_of_you.mp3'),
    require('../../assets/voice/dismiss_07_go_do_the_thing.mp3'),
    require('../../assets/voice/dismiss_08_forget_about_me.mp3'),
    require('../../assets/voice/dismiss_09_back_to_sleep.mp3'),
    require('../../assets/voice/dismiss_10_poor_life_choices.mp3'),
  ],
  intro: [
    require('../../assets/voice/intro_01_first_alarm.mp3'),
  ],
};

export default voiceClips;

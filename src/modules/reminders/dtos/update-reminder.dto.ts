import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateReminderDto } from "./create-reminder.dto";

// We don't allow changing the subscriptionId of an existing reminder
export class UpdateReminderDto extends PartialType(
  OmitType(CreateReminderDto, ["subscriptionId"] as const),
) {}

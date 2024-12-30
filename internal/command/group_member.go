package command

import (
	"context"

	"github.com/zitadel/zitadel/internal/domain"
	"github.com/zitadel/zitadel/internal/eventstore"
	"github.com/zitadel/zitadel/internal/repository/group"
	"github.com/zitadel/zitadel/internal/telemetry/tracing"
	"github.com/zitadel/zitadel/internal/zerrors"
)

func (c *Commands) AddGroupMember(ctx context.Context, member *domain.GroupMember, resourceOwner string) (_ *domain.GroupMember, err error) {
	ctx, span := tracing.NewSpan(ctx)
	defer func() { span.EndWithError(err) }()

	addedMember := NewGroupMemberWriteModel(member.GroupID, member.UserID, resourceOwner)
	groupAgg := GroupAggregateFromWriteModel(&addedMember.WriteModel)
	event, err := c.addGroupMember(ctx, groupAgg, addedMember, member)
	if err != nil {
		return nil, err
	}

	pushedEvents, err := c.eventstore.Push(ctx, event)
	if err != nil {
		return nil, err
	}
	err = AppendAndReduce(addedMember, pushedEvents...)
	if err != nil {
		return nil, err
	}

	return groupMemberWriteModelToMember(addedMember), nil
}

func (c *Commands) addGroupMember(ctx context.Context, groupAgg *eventstore.Aggregate, addedMember *GroupMemberWrite, member *domain.GroupMember) (_ eventstore.Command, err error) {
	ctx, span := tracing.NewSpan(ctx)
	defer func() { span.EndWithError(err) }()

	if !member.IsValid() {
		return nil, zerrors.ThrowInvalidArgument(nil, "GROUP-X9n3m", "Errors.Group.Member.Invalid")
	}

	err = c.checkUserExists(ctx, addedMember.UserID, "")
	if err != nil {
		return nil, err
	}
	err = c.eventstore.FilterToQueryReducer(ctx, addedMember)
	if err != nil {
		return nil, err
	}
	if addedMember.State == domain.GroupMemberStateActive {
		return nil, zerrors.ThrowAlreadyExists(nil, "GROUP-QvYJ2", "Errors.Group.Member.AlreadyExists")
	}

	return group.NewGroupMemberAddedEvent(ctx, groupAgg, member.UserID), nil
}

// ChangeGroupMember updates an existing member
func (c *Commands) ChangeGroupMember(ctx context.Context, member *domain.Member, resourceOwner string) (*domain.GroupMember, error) {
	if !member.IsValid() {
		return nil, zerrors.ThrowInvalidArgument(nil, "GROUP-MjbZi", "Errors.Group.Member.Invalid")
	}

	existingMember, err := c.groupMemberWriteModelByID(ctx, member.AggregateID, member.UserID, resourceOwner)
	if err != nil {
		return nil, err
	}

	groupAgg := GroupAggregateFromWriteModel(&existingMember.GroupMemberWriteModel.WriteModel)
	pushedEvents, err := c.eventstore.Push(ctx, group.NewGroupMemberChangedEvent(ctx, groupAgg, member.UserID))
	if err != nil {
		return nil, err
	}

	err = AppendAndReduce(existingMember, pushedEvents...)
	if err != nil {
		return nil, err
	}

	return groupMemberWriteModelToMember(existingMember), nil
}

func (c *Commands) RemoveGroupMember(ctx context.Context, groupID, userID, resourceOwner string) (*domain.ObjectDetails, error) {
	if groupID == "" || userID == "" {
		return nil, zerrors.ThrowInvalidArgument(nil, "GROUP-77nHd", "Errors.Group.Member.Invalid")
	}
	m, err := c.groupMemberWriteModelByID(ctx, groupID, userID, resourceOwner)
	if err != nil && !zerrors.IsNotFound(err) {
		return nil, err
	}
	if zerrors.IsNotFound(err) {
		// empty response because we have no data that match the request
		return &domain.ObjectDetails{}, nil
	}

	groupAgg := GroupAggregateFromWriteModel(&m.GroupMemberWriteModel.WriteModel)
	removeEvent := c.removeGroupMember(ctx, groupAgg, userID, false)
	pushedEvents, err := c.eventstore.Push(ctx, removeEvent)
	if err != nil {
		return nil, err
	}
	err = AppendAndReduce(m, pushedEvents...)
	if err != nil {
		return nil, err
	}
	return writeModelToObjectDetails(&m.WriteModel), nil
}

func (c *Commands) removeGroupMember(ctx context.Context, groupAgg *eventstore.Aggregate, userID string, cascade bool) eventstore.Command {
	if cascade {
		return group.NewGroupMemberCascadeRemovedEvent(
			ctx,
			groupAgg,
			userID)
	} else {
		return group.NewGroupMemberRemovedEvent(ctx, groupAgg, userID)
	}
}

func (c *Commands) groupMemberWriteModelByID(ctx context.Context, groupID, userID, resourceOwner string) (member *GroupMemberWrite, err error) {
	ctx, span := tracing.NewSpan(ctx)
	defer func() { span.EndWithError(err) }()

	writeModel := NewGroupMemberWriteModel(groupID, userID, resourceOwner)
	err = c.eventstore.FilterToQueryReducer(ctx, writeModel)
	if err != nil {
		return nil, err
	}

	if writeModel.State == domain.GroupMemberStateUnspecified || writeModel.State == domain.GroupMemberStateRemoved {
		return nil, zerrors.ThrowNotFound(nil, "GROUP-E9KyS", "Errors.NotFound")
	}

	return writeModel, nil
}

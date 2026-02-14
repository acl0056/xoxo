using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class SwitchParametersControl : UserControl
    {
        private Switch SerializableSwitch { get; }
        private string oldElementName;



        public SwitchParametersControl()
        {
            this.InitializeComponent();
        }

        public SwitchParametersControl(Switch sw)
        {
            this.InitializeComponent();

            SerializableSwitch = sw;

            cmbState.Items.Add(new ComboBoxItem() { Content = "None", Tag = (byte)0 });
            for (byte x = 1; x < SerializableSwitch.QuantityOfTerminals; x++)
                cmbState.Items.Add(new ComboBoxItem()
                {
                    Content = mapNumberLetters[x],
                    Tag = x
                });

            cmbPositions.SelectionChanged -= PositionsChanged;
            cmbPositions.SelectedIndex = SerializableSwitch.QuantityOfTerminals - 2;
            cmbPositions.SelectionChanged += PositionsChanged;

            cmbState.SelectionChanged -= StateChanged;
            cmbState.SelectedIndex = SerializableSwitch.State;
            cmbState.SelectionChanged += StateChanged;

            sw.PropertyChanged += handleChangeOfControls;

            
            handleChangeOfControls(null, null);


        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableSwitch.PropertyChanged -= handleChangeOfControls;

            var oldPositions = (byte)(cmbPositions.SelectedIndex + 1);
            var newPositions = (byte)(SerializableSwitch.QuantityOfTerminals - 1);

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableSwitch.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            cmbPositions.SelectionChanged -= PositionsChanged;
            cmbPositions.SelectedIndex = SerializableSwitch.QuantityOfTerminals - 2;
            updateCmbState(oldPositions, newPositions);
            cmbPositions.SelectionChanged += PositionsChanged;

            cmbState.SelectionChanged -= StateChanged;
            cmbState.SelectedIndex = SerializableSwitch.State ;
            cmbState.SelectionChanged += StateChanged;

            boxCOpen.Value = SerializableSwitch.COpen;
            boxRClosed.Value = SerializableSwitch.RClosed;

            SerializableSwitch.PropertyChanged += handleChangeOfControls;
        }

        private void updateCmbState(byte oldPositions, byte newPositions)
        {
            if (oldPositions == newPositions) return;

            bool addedPositions = newPositions > oldPositions;

            if (addedPositions)
            {
                for (byte x = (byte)(oldPositions + 1); x <= newPositions; x++)
                    cmbState.Items.Add(new ComboBoxItem()
                    {
                        Content = mapNumberLetters[x],
                        Tag = x
                    });
            }
            else
            {
                ComboBoxItem item;
                for (byte x = oldPositions; x > newPositions; x--)
                {
                    item = (ComboBoxItem)cmbState.Items[x];
                    cmbState.Items.Remove(item);
                }
            }
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableSwitch.ElementName;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableSwitch,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void StateChanged(object sender, SelectionChangedEventArgs e)
        {
            ComboBoxItem oldItem = (ComboBoxItem)e.RemovedItems[0];
            ComboBoxItem newItem = (ComboBoxItem)e.AddedItems[0];
            
            byte oldState = (byte)(oldItem.Tag);
            byte newState = (byte)(newItem.Tag);

            var command = new CommandSetValue()
            {
                Component = SerializableSwitch,
                Property = "State",
                OldValue = oldState,
                NewValue = newState
            };

            executeCommand(command);
        }

        private void PositionsChanged(object sender, SelectionChangedEventArgs e)
        {
            string oldPositionsValueString = (string)((ComboBoxItem)e.RemovedItems[0]).Content;
            var oldPositionsValue = byte.Parse(oldPositionsValueString);

            string newPositionsValueString = (string)((ComboBoxItem)e.AddedItems[0]).Content;
            var newPositionsValue = byte.Parse(newPositionsValueString);

            if (oldPositionsValue == newPositionsValue) return;

            bool selectedStateDeleted = SerializableSwitch.State > newPositionsValue;

            if (selectedStateDeleted)
                executeCommand(new CommandSetValue()
                {
                    Component = SerializableSwitch,
                    Property = "State",
                    OldValue = SerializableSwitch.State,
                    NewValue = newPositionsValue,
                    CommandType = CommandType.DontCalculate
                });
            
            
            updateCmbState(oldPositionsValue, newPositionsValue);

            var command = new CommandSetValue()
            {
                Component = SerializableSwitch,
                Property = "QuantityOfTerminals",
                OldValue = (byte)(oldPositionsValue + 1),
                NewValue = (byte)(newPositionsValue + 1),
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

        private void RClosedChanged(object sender, Common.ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSwitch,
                Property = "RClosed",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void COpenChanged(object sender, Common.ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSwitch,
                Property = "COpen",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }
        
        private Dictionary<byte, string> mapNumberLetters =
            new Dictionary<byte, string>() {
                {  1, "A" },
                {  2, "B" },
                {  3, "C" },
                {  4, "D" },
                {  5, "E" },
                {  6, "F" },
                {  7, "G" },
                {  8, "H" },
                {  9, "I" },
                { 10, "J" },
                { 11, "K" },
                { 12, "L" },
                { 13, "M" },
                { 14, "N" },
                { 15, "O" },
                { 16, "P" },
                { 17, "Q" },
                { 18, "R" },
                { 19, "S" },
                { 20, "T" },
                { 21, "U" },
                { 22, "V" },
                { 23, "W" },
                { 24, "X" },
                { 25, "Y" },
                { 26, "Z" },
            }; 

    }
}
